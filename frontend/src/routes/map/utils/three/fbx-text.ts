import * as THREE from 'three';

import {
	type FbxAttributeValue,
	type FbxModelAttributes,
	getFbxGeometricTransform
} from './fbx-attributes';

// 以下はNavisworksから書き出された調査対象FBXのProperties70で確認した属性キー。
// FBX標準のキーではなく、元CADの属性をNavisworksが書き出したカスタムプロパティと考えられる。
// 元データ形式、Navisworksの言語・バージョンによって名前が変わる可能性があるため、
// 別の出力パターンが確認された場合は候補キーとして追加する。
const TEXT_CONTENT_KEYS = ['Text - 内容', 'テキスト - テキスト'] as const;
const TEXT_HEIGHT_KEY = 'Text - 高さ';
const TEXT_ALIGNMENT_KEY = 'Text - 位置合わせ';
const TEXT_ROTATION_KEY = 'Text - 回転角度';
const TEXT_OBLIQUE_KEY = 'Text - 傾斜角度';
const TEXT_WIDTH_FACTOR_KEY = 'Text - 幅係数';
const TEXT_COLOR_KEY = 'General - 色';
const TEXT_MATERIAL_KEY = '項目 - マテリアル';

// 以下はFBX内の属性ではなく、属性から文字面を再構築するためのmorivis内部設定。
const TEXT_TEXTURE_FONT_SIZE = 96;
const TEXT_TEXTURE_PADDING = 8;
const TEXT_LINE_HEIGHT = 1.2;
const DEFAULT_TEXT_HEIGHT = 1;
const DEFAULT_TEXT_COLOR = '#ffffff';
const GENERATED_TEXT_TEXTURE_KEY = 'morivisGeneratedFbxTextTexture';

type FbxTextAlignment = 'left' | 'center' | 'middle' | 'top-center';

export interface FbxTextDescriptor {
	target: THREE.Object3D;
	text: string;
	height: number;
	widthFactor: number;
	alignment: FbxTextAlignment;
	rotation: number;
	oblique: number;
	color: string;
	geometricTransform?: THREE.Matrix4;
}

export interface RenderedFbxTextTexture {
	texture: THREE.Texture;
	widthInTextHeights: number;
	heightInTextHeights: number;
}

export type FbxTextTextureFactory = (text: string) => RenderedFbxTextTexture | undefined;

const getScalarAttribute = (value: FbxAttributeValue | undefined) =>
	Array.isArray(value) ? value[0] : value;

const getStringAttribute = (value: FbxAttributeValue | undefined) => {
	const scalar = getScalarAttribute(value);
	return scalar == null ? undefined : String(scalar);
};

const getNumberAttribute = (value: FbxAttributeValue | undefined, fallback: number) => {
	const number = Number(getScalarAttribute(value));
	return Number.isFinite(number) ? number : fallback;
};

const getTextAlignment = (value: FbxAttributeValue | undefined): FbxTextAlignment => {
	const alignment = getStringAttribute(value)?.trim().toLowerCase() ?? '';
	if (alignment.includes('tc') || alignment.includes('上中心')) return 'top-center';
	if (alignment.includes('中央') || alignment.includes('(m)')) return 'middle';
	if (alignment.includes('中心') || alignment.includes('(c)')) return 'center';
	return 'left';
};

const AUTOCAD_BASE_COLORS: Record<number, string> = {
	1: '#ff0000',
	2: '#ffff00',
	3: '#00ff00',
	4: '#00ffff',
	5: '#0000ff',
	6: '#ff00ff',
	7: '#ffffff',
	8: '#808080',
	9: '#c0c0c0'
};

const AUTOCAD_HUE_COLORS = [
	[255, 0, 0],
	[255, 63, 0],
	[255, 127, 0],
	[255, 191, 0],
	[255, 255, 0],
	[191, 255, 0],
	[127, 255, 0],
	[63, 255, 0],
	[0, 255, 0],
	[0, 255, 63],
	[0, 255, 127],
	[0, 255, 191],
	[0, 255, 255],
	[0, 191, 255],
	[0, 127, 255],
	[0, 63, 255],
	[0, 0, 255],
	[63, 0, 255],
	[127, 0, 255],
	[191, 0, 255],
	[255, 0, 255],
	[255, 0, 191],
	[255, 0, 127],
	[255, 0, 63]
] as const;
const AUTOCAD_SHADE_VALUES = [1, 0.65, 0.5, 0.3, 0.15] as const;
const AUTOCAD_GRAY_VALUES = [51, 80, 105, 130, 190, 255] as const;

const rgbToHex = (rgb: readonly number[]) =>
	`#${
		rgb.map((value) =>
			Math.max(0, Math.min(255, Math.round(value)))
				.toString(16).padStart(2, '0')
		).join('')
	}`;

const getAutocadColor = (index: number) => {
	if (!Number.isInteger(index)) return undefined;
	const baseColor = AUTOCAD_BASE_COLORS[index];
	if (baseColor) return baseColor;
	if (index >= 250 && index <= 255) {
		const value = AUTOCAD_GRAY_VALUES[index - 250];
		return rgbToHex([value, value, value]);
	}
	if (index < 10 || index > 249) return undefined;

	const offset = index - 10;
	const hue = AUTOCAD_HUE_COLORS[Math.floor(offset / 10)];
	const shadeIndex = Math.floor((offset % 10) / 2);
	const value = AUTOCAD_SHADE_VALUES[shadeIndex];
	const saturation = offset % 2 === 0 ? 1 : 0.5;
	return rgbToHex(
		hue.map((channel) => 255 * value * ((channel / 255) * saturation + 1 - saturation))
	);
};

const getFbxTextColor = (attributes: FbxModelAttributes) => {
	const rawColor = getStringAttribute(attributes[TEXT_COLOR_KEY])?.trim();
	if (rawColor) {
		const rgb = rawColor.split(',').map(Number);
		if (rgb.length === 3 && rgb.every((value) => Number.isFinite(value))) {
			return rgbToHex(rgb);
		}
		const namedColors: Record<string, string> = {
			black: '#000000',
			blue: '#0000ff',
			cyan: '#00ffff',
			green: '#00ff00',
			magenta: '#ff00ff',
			red: '#ff0000',
			white: '#ffffff',
			yellow: '#ffff00'
		};
		const namedColor = namedColors[rawColor.toLowerCase()];
		if (namedColor) return namedColor;
		const colorIndex = Number(rawColor);
		const indexedColor = getAutocadColor(colorIndex);
		if (indexedColor) return indexedColor;
	}

	const material = getStringAttribute(attributes[TEXT_MATERIAL_KEY]);
	const colorIndex = Number(
		material?.match(/(?:AutoCAD\s+)?(?:カラーインデックス|Color Index)\s*(\d+)/i)?.[1]
	);
	return getAutocadColor(colorIndex) ?? DEFAULT_TEXT_COLOR;
};

const getFbxTextContent = (attributes: FbxModelAttributes) => {
	for (const key of TEXT_CONTENT_KEYS) {
		const text = getStringAttribute(attributes[key])?.trim();
		if (text) return text.replace(/\\P/gi, '\n');
	}
	return undefined;
};

export const getFbxTextDescriptors = (
	object: THREE.Object3D,
	attributesByModelId: Record<string, FbxModelAttributes>
) => {
	// Navisworks由来のFBXでは、CAD文字がジオメトリのないGroupとProperties70だけで残る。
	// FBXLoaderは空Groupまでは生成するため、そのModel IDへ属性を戻して描画情報を復元する。
	const descriptors: FbxTextDescriptor[] = [];
	object.traverse((child) => {
		const modelId = (child as THREE.Object3D & { ID?: number; }).ID;
		if (modelId == null) return;
		const attributes = attributesByModelId[String(modelId)];
		if (!attributes) return;
		// 「項目 - タイプ」だけでは判定せず、実際に文字内容を持つModelを対象にする。
		const text = getFbxTextContent(attributes);
		if (!text) return;

		const height = getNumberAttribute(attributes[TEXT_HEIGHT_KEY], DEFAULT_TEXT_HEIGHT);
		const widthFactor = getNumberAttribute(attributes[TEXT_WIDTH_FACTOR_KEY], 1);
		descriptors.push({
			target: child,
			text,
			height: height > 0 ? height : DEFAULT_TEXT_HEIGHT,
			widthFactor: widthFactor > 0 ? widthFactor : 1,
			alignment: getTextAlignment(attributes[TEXT_ALIGNMENT_KEY]),
			rotation: getNumberAttribute(attributes[TEXT_ROTATION_KEY], 0),
			oblique: getNumberAttribute(attributes[TEXT_OBLIQUE_KEY], 0),
			color: getFbxTextColor(attributes),
			geometricTransform: getFbxGeometricTransform(attributes)
		});
	});
	return descriptors;
};

const createCanvasTextTexture: FbxTextTextureFactory = (text) => {
	if (typeof document === 'undefined') return undefined;
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	if (!context) return undefined;
	const lines = text.split(/\r?\n/);
	const font =
		`${TEXT_TEXTURE_FONT_SIZE}px "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`;
	context.font = font;
	const textWidth = Math.max(
		TEXT_TEXTURE_FONT_SIZE,
		...lines.map((line) => context.measureText(line || ' ').width)
	);
	canvas.width = Math.ceil(textWidth + TEXT_TEXTURE_PADDING * 2);
	canvas.height = Math.ceil(
		TEXT_TEXTURE_FONT_SIZE * TEXT_LINE_HEIGHT * lines.length + TEXT_TEXTURE_PADDING * 2
	);

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.font = font;
	context.fillStyle = '#ffffff';
	context.textAlign = 'left';
	context.textBaseline = 'top';
	lines.forEach((line, index) => {
		context.fillText(
			line,
			TEXT_TEXTURE_PADDING,
			TEXT_TEXTURE_PADDING + TEXT_TEXTURE_FONT_SIZE * TEXT_LINE_HEIGHT * index
		);
	});

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.minFilter = THREE.LinearMipmapLinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.generateMipmaps = true;
	texture.userData[GENERATED_TEXT_TEXTURE_KEY] = true;
	return {
		texture,
		widthInTextHeights: canvas.width / TEXT_TEXTURE_FONT_SIZE,
		heightInTextHeights: canvas.height / TEXT_TEXTURE_FONT_SIZE
	};
};

const getTextAnchorOffset = (
	alignment: FbxTextAlignment,
	width: number,
	height: number
) => {
	if (alignment === 'top-center') return new THREE.Vector2(0, -height / 2);
	if (alignment === 'left') return new THREE.Vector2(width / 2, height * 0.35);
	if (alignment === 'center') return new THREE.Vector2(0, height * 0.35);
	return new THREE.Vector2();
};

export const createFbxTextMeshes = (
	object: THREE.Object3D,
	attributesByModelId: Record<string, FbxModelAttributes>,
	textureFactory: FbxTextTextureFactory = createCanvasTextTexture
) => {
	const textureCache = new Map<string, RenderedFbxTextTexture>();
	let createdCount = 0;
	getFbxTextDescriptors(object, attributesByModelId).forEach((descriptor) => {
		let rendered = textureCache.get(descriptor.text);
		if (!rendered) {
			rendered = textureFactory(descriptor.text);
			if (!rendered) return;
			textureCache.set(descriptor.text, rendered);
		}

		const width = descriptor.height * rendered.widthInTextHeights * descriptor.widthFactor;
		const height = descriptor.height * rendered.heightInTextHeights;
		const geometry = new THREE.PlaneGeometry(width, height);
		const obliqueShear = Math.tan(THREE.MathUtils.degToRad(descriptor.oblique));
		if (descriptor.oblique !== 0 && Number.isFinite(obliqueShear)) {
			geometry.applyMatrix4(new THREE.Matrix4().set(
				1,
				obliqueShear,
				0,
				0,
				0,
				1,
				0,
				0,
				0,
				0,
				1,
				0,
				0,
				0,
				0,
				1
			));
		}
		const anchor = getTextAnchorOffset(descriptor.alignment, width, height);
		geometry.translate(anchor.x, anchor.y, 0);
		if (descriptor.rotation !== 0) {
			geometry.rotateZ(THREE.MathUtils.degToRad(descriptor.rotation));
		}
		if (descriptor.geometricTransform) {
			geometry.applyMatrix4(descriptor.geometricTransform);
		}
		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();

		const material = new THREE.MeshBasicMaterial({
			alphaTest: 0.02,
			color: descriptor.color,
			depthTest: true,
			depthWrite: false,
			map: rendered.texture,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -1,
			side: THREE.DoubleSide,
			transparent: true,
			toneMapped: false
		});
		const mesh = new THREE.Mesh(geometry, material);
		mesh.name = 'FBX text';
		mesh.renderOrder = 2;
		mesh.userData.morivisFbxText = true;
		mesh.userData.morivisFbxTextContent = descriptor.text;
		mesh.raycast = () => undefined;
		descriptor.target.add(mesh);
		createdCount += 1;
	});
	return createdCount;
};

export const setFbxTextStyle = (
	object: THREE.Object3D,
	visible: boolean,
	opacity: number
) => {
	object.traverse((child) => {
		if (child.userData.morivisFbxText !== true || !(child as THREE.Mesh).isMesh) return;
		child.visible = visible;
		const mesh = child as THREE.Mesh;
		const materials: THREE.Material[] = Array.isArray(mesh.material)
			? mesh.material
			: [mesh.material];
		materials.forEach((material) => {
			const textMaterial = material as THREE.MeshBasicMaterial;
			textMaterial.opacity = opacity;
			textMaterial.transparent = true;
		});
	});
};

export const isGeneratedFbxTextTexture = (texture: THREE.Texture) =>
	texture.userData[GENERATED_TEXT_TEXTURE_KEY] === true;
