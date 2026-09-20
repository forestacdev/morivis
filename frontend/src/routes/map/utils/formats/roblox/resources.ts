import { isRobloxDeliveryUrl } from './delivery-url';
import { materialMapKeys } from './materials';
import { parseRobloxMesh, type RobloxMesh } from './mesh';
import type { PreparedRobloxMaterial } from './pbr';
import type { RobloxPart, RobloxWorld } from './world';

export interface RobloxImage {
	bytes: Uint8Array<ArrayBuffer>;
	mimeType: 'image/png' | 'image/jpeg';
}
export interface RobloxResources {
	images: Map<string, RobloxImage>;
	meshes: Map<string, RobloxMesh>;
	materials?: Map<RobloxPart, PreparedRobloxMaterial>;
}
interface ResourceOptions {
	/** 省略時は公開アセットAPIを使う。指定時はこの配下を優先する。 */
	resourceUrl?: string;
	/** 秘密鍵を保持するローカルdev serverの取得口。 */
	authenticatedAssetUrl?: string;
	resolveUrl?: (url: string) => string;
	fetcher?: typeof fetch;
}

/** IDと組み込み素材のパスだけを扱い、ワールド内の任意URLにはアクセスしない。 */
export const robloxAssetKey = (value: string): string | null => {
	const input = value.trim();
	const id = /^(?:rbxassetid:\/\/)?([1-9]\d*)$/i.exec(input)?.[1];
	if (id) return `assets/${id}`;
	if (input.startsWith('rbxasset://')) {
		const path = input.slice(11);
		if (/^[\w./-]+$/.test(path) && !path.split('/').some(p => !p || p === '.' || p === '..')) {
			return `builtin/${path}`;
		}
		return null;
	}
	try {
		const url = new URL(input);
		if (
			!['https:', 'http:'].includes(url.protocol)
			|| !['www.roblox.com', 'roblox.com', 'assetdelivery.roblox.com'].includes(url.hostname)
			|| !/^\/(?:v1\/)?asset\/?$/.test(url.pathname)
		) return null;
		const assetId = url.searchParams.get('id');
		return assetId && /^[1-9]\d*$/.test(assetId) ? `assets/${assetId}` : null;
	} catch {
		return null;
	}
};

const unpack = async (bytes: Uint8Array<ArrayBuffer>) => {
	// CDNによってはgzipをContent-Encodingなしで配信する。
	if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes;
	const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
};

export const decodeRobloxImage = async (bytes: Uint8Array<ArrayBuffer>): Promise<RobloxImage> => {
	let mimeType: RobloxImage['mimeType'];
	if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) mimeType = 'image/png';
	else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) mimeType = 'image/jpeg';
	else throw new Error('未対応の画像形式');
	// 壊れた画像をGLBに入れるとモデル全体の読込に失敗するため、Worker内で確認する。
	const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
	bitmap.close();
	return { bytes, mimeType };
};

export const loadRobloxResources = async (
	world: RobloxWorld,
	{
		resourceUrl,
		authenticatedAssetUrl,
		resolveUrl = url => url,
		fetcher = (url, init) => fetch(url, init)
	}: ResourceOptions = {}
): Promise<RobloxResources> => {
	const resources: RobloxResources = { images: new Map(), meshes: new Map() };
	const requests = new Map<string, { images: Set<string>; meshes: Set<string>; }>();
	const errors = new Map<string, number>();
	const failure = (reason: string) => errors.set(reason, (errors.get(reason) ?? 0) + 1);
	const add = (asset: string | undefined, kind: 'images' | 'meshes') => {
		if (!asset) return;
		const key = robloxAssetKey(asset) ?? `unsupported:${asset}`;
		const item = requests.get(key) ?? { images: new Set(), meshes: new Set() };
		item[kind].add(asset);
		requests.set(key, item);
	};
	for (const part of world.parts) {
		add(part.meshId, 'meshes');
		if (!part.material) add(part.textureId, 'images');
		if (part.material) materialMapKeys.forEach(key => add(part.material![key], 'images'));
		part.textures?.forEach(texture => add(texture.asset, 'images'));
	}
	const get = async (url: string) => {
		const response = await fetcher(resolveUrl(url), {
			credentials: 'omit',
			signal: AbortSignal.timeout(15000)
		});
		if (!response.ok) {
			throw new Error(
				response.status === 401
					? '素材の取得に認証が必要'
					: response.status === 403
					? '素材を取得する権限がありません'
					: `素材の取得失敗（HTTP ${response.status}）`
			);
		}
		return response;
	};
	const read = async (key: string) => {
		if (key.startsWith('unsupported:')) throw new Error('未対応の素材参照');
		if (resourceUrl) {
			const response = await fetcher(`${resourceUrl.replace(/\/$/, '')}/${key}`, {
				credentials: 'omit',
				signal: AbortSignal.timeout(15000)
			});
			if (
				response.ok && response.status !== 204
				&& !response.headers.get('content-type')?.includes('text/html')
			) {
				return unpack(new Uint8Array(await response.arrayBuffer()));
			}
			if (![200, 204, 404].includes(response.status)) {
				throw new Error(`配置素材の取得失敗（HTTP ${response.status}）`);
			}
		}
		if (key.startsWith('builtin/')) throw new Error('組み込み素材が未配置');
		const id = key.slice(7);
		if (authenticatedAssetUrl) {
			const response = await fetcher(`${authenticatedAssetUrl}/${id}`, {
				credentials: 'omit',
				signal: AbortSignal.timeout(35000)
			});
			if (response.ok) return unpack(new Uint8Array(await response.arrayBuffer()));
			if (
				response.status !== 404
				|| response.headers.get('content-type')?.includes('application/json')
			) {
				const detail = await response.json().catch(() => null) as
					| { error?: string; }
					| null;
				throw new Error(
					response.status === 401
						? 'Roblox APIキーの認証失敗'
						: response.status === 403
						? '素材を取得する権限がありません'
						: typeof detail?.error === 'string'
						? detail.error.slice(0, 160)
						: `認証付き素材の取得失敗（HTTP ${response.status}）`
				);
			}
		}
		const response = await get(`https://assetdelivery.roblox.com/v2/assetId/${id}`);
		const metadata = await response.json() as {
			locations?: { location: string; }[];
			errors?: { code: number; }[];
		};
		if (metadata.errors?.some(error => error.code === 401 || error.code === 403)) {
			throw new Error('素材の取得に認証が必要');
		}
		const location = metadata.locations?.[0]?.location;
		if (!location) throw new Error('素材の配信先が見つからない');
		if (!isRobloxDeliveryUrl(location)) {
			throw new Error('素材の配信先が不正');
		}
		return unpack(new Uint8Array(await (await get(location)).arrayBuffer()));
	};
	const queue = [...requests];
	let cursor = 0;
	await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
		while (cursor < queue.length) {
			const [key, item] = queue[cursor++];
			try {
				const bytes = await read(key);
				if (item.meshes.size) {
					const mesh = parseRobloxMesh(bytes);
					item.meshes.forEach(asset => resources.meshes.set(asset, mesh));
				}
				if (item.images.size) {
					const image = await decodeRobloxImage(bytes);
					item.images.forEach(asset => resources.images.set(asset, image));
				}
			} catch (error) {
				failure(
					error instanceof TypeError
						? '素材の通信失敗（CORS・接続）'
						: error instanceof Error
						? error.message
						: '素材の取得失敗'
				);
			}
		}
	}));
	world.warnings.push(...[...errors].map(([reason, count]) => `${reason}: ${count}件`));
	return resources;
};
