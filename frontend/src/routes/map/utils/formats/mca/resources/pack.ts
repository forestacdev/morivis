import { selectVariants } from './models';
import { decodeResourceTexture } from './texture';
import {
	type BlockDefinition,
	type BlockModel,
	type PackManifest,
	type ResolvedVariant,
	resourceId,
	resourcePath,
	type ResourceTexture
} from './types';

// Workerのネイティブfetchへ、クラスインスタンスをthisとして渡さない。
const fetchResource: typeof fetch = (input, init) => globalThis.fetch(input, init);

export class MinecraftResourcePack {
	private names: Set<string>;
	private jsonCache = new Map<string, Promise<unknown>>();
	private modelCache = new Map<string, BlockModel>();
	private textureCache = new Map<string, Promise<ResourceTexture>>();
	constructor(
		readonly manifest: PackManifest,
		private root: string,
		private fetcher: typeof fetch = fetchResource,
		private decodeTexture = decodeResourceTexture
	) {
		this.names = new Set(manifest.blockstates.map(resourceId));
		this.root = root.endsWith('/') ? root : `${root}/`;
	}
	private json = async (path: string): Promise<unknown> => {
		let pending = this.jsonCache.get(path);
		if (!pending) {
			pending = this.fetcher(`${this.root}${path}`).then(async (response) => {
				if (!response.ok) {
					throw new Error(`Minecraft素材を読めません: ${path} (${response.status})`);
				}
				return response.json();
			});
			this.jsonCache.set(path, pending);
		}
		return pending;
	};
	model = async (name: string, parents: string[] = []): Promise<BlockModel> => {
		name = resourceId(name);
		if (name.startsWith('minecraft:builtin/')) return { unsupported: true };
		if (parents.includes(name) || parents.length > 64) {
			throw new Error(`モデル継承が循環しています: ${name}`);
		}
		const cached = this.modelCache.get(name);
		if (cached) return cached;
		const model = await this.json(resourcePath('models', name)) as BlockModel;
		if (!model || typeof model !== 'object' || Array.isArray(model)) {
			throw new Error(`モデル定義が不正です: ${name}`);
		}
		const parent = model.parent ? await this.model(model.parent, [...parents, name]) : {};
		const resolved = {
			unsupported: parent.unsupported,
			textures: { ...parent.textures, ...model.textures },
			elements: model.elements ?? parent.elements ?? []
		};
		this.modelCache.set(name, resolved);
		return resolved;
	};
	variants = async (
		name: string,
		state: Record<string, string>
	): Promise<ResolvedVariant[][] | null> => {
		if (
			!this.names.has(name)
			|| ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name)
		) return null;
		const definition = await this.json(resourcePath('blockstates', name)) as BlockDefinition;
		if (!definition || typeof definition !== 'object') {
			throw new Error(`ブロック定義が不正です: ${name}`);
		}
		const groups = await Promise.all(
			selectVariants(definition, { ...this.manifest.defaultStates?.[name], ...state }).map(
				async (variants) => {
					if (!variants.length) throw new Error(`空のモデル候補です: ${name}`);
					return Promise.all(variants.map(async (variant) => {
						if (
							!variant || typeof variant.model !== 'string'
							|| ![variant.x ?? 0, variant.y ?? 0].every((v) =>
								Number.isFinite(v) && v % 90 === 0
							)
							|| !Number.isSafeInteger(variant.weight ?? 1)
							|| (variant.weight ?? 1) <= 0
						) {
							throw new Error(`ブロックのモデル指定が不正です: ${name}`);
						}
						return { ...variant, definition: await this.model(variant.model) };
					}));
				}
			)
		);
		return (definition.variants && !groups.length)
				|| groups.some((group) => group.some((variant) => variant.definition.unsupported))
			? null
			: groups;
	};
	texture = (name: string): Promise<ResourceTexture> => {
		name = resourceId(name);
		let pending = this.textureCache.get(name);
		if (!pending) {
			pending = (async () => {
				const response = await this.fetcher(
					`${this.root}${resourcePath('textures', name)}`
				);
				if (!response.ok) {
					throw new Error(`テクスチャを読めません: ${name} (${response.status})`);
				}
				return this.decodeTexture(
					name,
					await response.blob(),
					this.manifest.animations?.[name]
				);
			})();
			this.textureCache.set(name, pending);
		}
		return pending;
	};
}

export const loadMinecraftResourcePack = async (
	root: string,
	fetcher: typeof fetch = fetchResource
) => {
	root = root.endsWith('/') ? root : `${root}/`;
	const response = await fetcher(`${root}manifest.json`, { cache: 'no-cache' });
	if (!response.ok) throw new Error(`Minecraft素材一覧を読めません (${response.status})`);
	const manifest = await response.json() as PackManifest;
	if (
		!manifest || manifest.format !== 1 || !Array.isArray(manifest.blockstates)
		|| !manifest.blockstates.every((id) => typeof id === 'string')
	) {
		throw new Error('Minecraft素材一覧が不正です');
	}
	return manifest.blockstates.length ? new MinecraftResourcePack(manifest, root, fetcher) : null;
};
