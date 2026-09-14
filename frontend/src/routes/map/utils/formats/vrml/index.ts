import * as THREE from 'three';

interface VrmlParseOptions {
	resourceUrls?: Record<string, string>;
	resourcePath?: string;
	manager?: THREE.LoadingManager;
	/** 範囲計算では画像を読まず、Worker / Nodeでも形状を解析する。 */
	skipTextures?: boolean;
}

interface TextureUrlField {
	start: number;
	end: number;
	urls: string[];
}

const validateVrmlText = (text: string) => {
	const source = text.replace(/^\uFEFF/, '');
	if (!source.trim()) throw new Error('VRMLファイルが空です');
	if (!/^#VRML V2\.0 utf8\s*(?:\r?\n|$)/.test(source)) {
		throw new Error('VRML 2.0（#VRML V2.0 utf8）形式に対応しています');
	}
	return source;
};

// コメントと引用符内の括弧をノード構造と混同しないよう、必要なトークンだけを読む。
const getTextureUrlFields = (text: string): TextureUrlField[] => {
	const tokens = [...text.matchAll(/"(?:\\.|[^"\\])*"|#[^\r\n]*|[A-Za-z_][\w-]*|[{}[\]]/g)]
		.filter((token) => !token[0].startsWith('#'));
	const nodes: string[] = [];
	const fields: TextureUrlField[] = [];
	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i][0];
		if (token === '{') nodes.push(tokens[i - 1]?.[0] ?? '');
		else if (token === '}') nodes.pop();
		else if (token === 'url' && nodes.at(-1) === 'ImageTexture') {
			const start = i + 1;
			let end = start;
			if (tokens[start]?.[0] === '[') {
				while (end < tokens.length && tokens[end][0] !== ']') end += 1;
			}
			if (!tokens[end]) continue;
			const urls = tokens.slice(start, end + 1)
				.filter((value) => value[0].startsWith('"'))
				.map((value) => value[0].slice(1, -1).replace(/\\(["\\])/g, '$1'));
			fields.push({
				start: tokens[start].index!,
				end: tokens[end].index! + tokens[end][0].length,
				urls
			});
			i = end;
		}
	}
	return fields;
};

export const inspectVrmlFile = async (file: File) => {
	const text = validateVrmlText(await file.text());
	return {
		// VRMLLoaderが利用する先頭URLに合わせる。外部URLは追加ファイルを要求しない。
		referencedTexturePaths: [
			...new Set(
				getTextureUrlFields(text)
					.map((field) => field.urls[0])
					.filter((url): url is string =>
						!!url && !/^(?:https?:|data:|blob:|\/\/)/i.test(url)
					)
			)
		]
	};
};

const resolveResourceUrl = (url: string, resources: Record<string, string>) => {
	const normalized = url.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
	return resources[normalized]
		?? resources[normalized.split('/').slice(1).join('/')]
		?? resources[normalized.split('/').pop() ?? '']
		?? url;
};

/** VRML 2.0を、既存のmesh runtimeで扱うObject3Dへ変換する。 */
export const parseVrmlText = async (text: string, options: VrmlParseOptions = {}) => {
	let source = validateVrmlText(text);
	if (options.skipTextures) {
		const fields = getTextureUrlFields(source);
		const parts: string[] = [];
		let offset = 0;
		fields.forEach((field) => {
			parts.push(source.slice(offset, field.start), '[]');
			offset = field.end;
		});
		parts.push(source.slice(offset));
		source = parts.join('');
	}

	const { VRMLLoader } = await import('three/addons/loaders/VRMLLoader.js');
	const manager = options.manager ?? new THREE.LoadingManager();
	if (options.resourceUrls) {
		const resources = options.resourceUrls;
		manager.setURLModifier((url) => resolveResourceUrl(url, resources));
	}
	let object: THREE.Scene;
	try {
		object = new VRMLLoader(manager).parse(source, options.resourcePath ?? '');
	} catch {
		throw new Error('VRMLファイルを解析できませんでした');
	}
	let hasGeometry = false;
	object.traverse((child) => {
		const geometry = (child as THREE.Mesh).geometry;
		if (!geometry?.getAttribute('position')?.count) return;
		hasGeometry = true;
		// 一部の出力ソフトは空のTextureCoordinateとインデックスを併記する。
		// Loaderが生成するNaNのUVを描画へ渡さない。
		const uv = geometry.getAttribute('uv');
		if (uv && !Array.from(uv.array).every(Number.isFinite)) geometry.deleteAttribute('uv');
	});
	if (!hasGeometry) throw new Error('VRMLファイルに描画できる形状がありません');
	return object;
};

export const parseVrmlFile = async (file: File, options: VrmlParseOptions = {}) =>
	parseVrmlText(await file.text(), options);
