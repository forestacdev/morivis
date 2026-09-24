import { createMaterialResolver, type RobloxMaterial } from './materials';
export type RobloxShape = 'block' | 'ball' | 'cylinder' | 'wedge';
export type RobloxVector = [number, number, number];
export interface RobloxTexture {
	asset: string;
	face: number;
	color: RobloxVector;
	opacity: number;
	tile?: [number, number];
	offset: [number, number];
	zIndex: number;
	baked?: boolean;
}
export interface RobloxPart {
	shape: RobloxShape;
	size: RobloxVector;
	position: RobloxVector;
	/** 行優先。CFrameはワールド座標なので親Modelのピボットを重ねない。 */
	rotation: number[];
	color: RobloxVector;
	opacity: number;
	textures?: RobloxTexture[];
	meshId?: string;
	textureId?: string;
	surfaceColor?: RobloxVector;
	material?: RobloxMaterial;
}
export interface RobloxWorld {
	parts: RobloxPart[];
	warnings: string[];
}
/** XMLとバイナリの共通中間表現。描画に必要なプロパティだけを保持する。 */
export interface RobloxInstance {
	className: string;
	name?: string;
	material?: number;
	materialVariant?: string;
	materialOverrides?: Record<string, string>;
	use2022Materials?: boolean;
	studsPerTile?: number;
	materialPattern?: number;
	alphaMode?: number;
	normalMap?: string;
	roughnessMap?: string;
	metalnessMap?: string;
	children: RobloxInstance[];
	size?: RobloxVector;
	position?: RobloxVector;
	rotation?: number[];
	color?: RobloxVector;
	shape?: number;
	transparency?: number;
	legacyColor?: boolean;
	terrainData?: boolean;
	texture?: string;
	meshId?: string;
	textureId?: string;
	colorMap?: string;
	face?: number;
	tileU?: number;
	tileV?: number;
	offsetU?: number;
	offsetV?: number;
	zIndex?: number;
}
export const supportedClasses = new Set([
	'Part',
	'MeshPart',
	'WedgePart',
	'SpawnLocation',
	'Seat',
	'VehicleSeat'
]);
const unsupportedClasses = new Set([
	'UnionOperation',
	'NegateOperation',
	'PartOperation',
	'TrussPart',
	'CornerWedgePart'
]);
const meshModifiers = new Set(['SpecialMesh', 'BlockMesh', 'CylinderMesh']);
export const textureClasses = new Set(['Decal', 'Texture', 'SurfaceAppearance', 'MaterialVariant']);
const shapes: Partial<Record<number, RobloxShape>> = {
	0: 'ball',
	1: 'block',
	2: 'cylinder',
	3: 'wedge'
};

export const instancesToWorld = (roots: RobloxInstance[]): RobloxWorld => {
	const workspaces = roots.filter(node => node.className === 'Workspace');
	if (!workspaces.length) throw new Error('ワールドにWorkspaceがありません。');
	const parts: RobloxPart[] = [], skipped = new Map<string, number>();
	const skip = (label: string) => skipped.set(label, (skipped.get(label) ?? 0) + 1);
	const resolveMaterial = createMaterialResolver(roots, skip);
	const stack = workspaces.flatMap(node => node.children);
	while (stack.length) {
		const node = stack.pop()!;
		for (const child of node.children) stack.push(child);
		const { className } = node;
		if (unsupportedClasses.has(className)) {
			skip(className);
			continue;
		}
		if (textureClasses.has(className)) continue;
		if (className === 'Terrain') {
			if (node.terrainData) skip('Terrain');
			continue;
		}
		if (!supportedClasses.has(className)) continue;
		if (className === 'MeshPart' && !node.meshId) {
			skip('MeshPart（MeshIdなし）');
			continue;
		}
		const opacity = 1 - Math.max(0, Math.min(1, node.transparency ?? 0));
		if (opacity === 0) continue;
		if (node.children.some(child => meshModifiers.has(child.className))) {
			skip('メッシュ付きPart');
			continue;
		}
		const shape = className === 'WedgePart'
			? 'wedge'
			: className === 'Part'
			? shapes[node.shape ?? 1]
			: 'block';
		if (!shape) {
			skip('未対応のパーツ形状');
			continue;
		}
		const size: RobloxVector = node.size ?? [4, 1.2, 2];
		const position: RobloxVector = node.position ?? [0, 0, 0];
		const rotation = node.rotation ?? [1, 0, 0, 0, 1, 0, 0, 0, 1];
		const color = node.color ?? [163 / 255, 162 / 255, 165 / 255];
		if (![...size, ...position, ...rotation, ...color, opacity].every(Number.isFinite)) {
			throw new Error('パーツに不正な数値があります。');
		}
		if (size.some(value => value <= 0)) {
			throw new Error('パーツのサイズは正の数である必要があります。');
		}
		// 背景用の大きなBaseplateだけを除外し、建物の床や地面のMeshPartは残す。
		if (
			className === 'Part' && node.name === 'Baseplate' && shape === 'block'
			&& Math.min(size[0], size[2]) >= 256
			&& size[1] <= Math.min(size[0], size[2]) / 16
			&& Math.abs(rotation[4]) > 0.9999
		) continue;
		if (!node.color && node.legacyColor) skip('旧形式の色（グレーで代替）');
		const textures: RobloxTexture[] = [];
		for (const child of node.children) {
			if (!['Texture', 'Decal'].includes(child.className) || !child.texture) continue;
			if (shape !== 'block' || node.meshId) {
				skip('曲面・メッシュ上のDecal/Texture');
				continue;
			}
			const face = child.face ?? 5;
			const tile: [number, number] | undefined = child.className === 'Texture'
				? [child.tileU ?? 2, child.tileV ?? 2]
				: undefined;
			const tint = child.color ?? [1, 1, 1];
			const offset: [number, number] = [child.offsetU ?? 0, child.offsetV ?? 0];
			const transparency = child.transparency ?? 0;
			const zIndex = child.zIndex ?? 1;
			if (
				!Number.isInteger(face) || face < 0 || face > 5
				|| ![...tint, ...offset, transparency, zIndex, ...(tile ?? [])].every(
					Number.isFinite
				)
				|| tile?.some(value => value <= 0)
			) {
				skip('不正なテクスチャ設定');
				continue;
			}
			if (transparency >= 1) continue;
			textures.push({
				asset: child.texture,
				face,
				color: tint,
				opacity: 1 - Math.max(0, transparency),
				tile,
				offset,
				zIndex
			});
		}
		const surface = node.children.find(child => child.className === 'SurfaceAppearance');
		const material = resolveMaterial(node);
		parts.push({
			shape,
			size,
			position,
			rotation,
			color: color.map(value => Math.max(0, Math.min(1, value))) as RobloxVector,
			opacity,
			...(material ? { material } : {}),
			...(textures.length ? { textures } : {}),
			...(node.meshId
				? {
					meshId: node.meshId,
					textureId: surface?.colorMap || node.textureId,
					surfaceColor: surface?.color
				}
				: {})
		});
	}
	const warnings = [...skipped].map(([label, count]) => `${label}: ${count}件`);
	if (!parts.length) {
		throw new Error(
			`表示できる基本パーツがありません。${
				warnings.length ? ` 未対応: ${warnings.join('、')}` : ''
			}`
		);
	}
	return { parts, warnings };
};
