export type Vec3 = [number, number, number];
export type Direction = 'down' | 'up' | 'north' | 'south' | 'west' | 'east';
export type AlphaMode = 'OPAQUE' | 'MASK' | 'BLEND';
export interface ModelFace {
	texture: string;
	uv?: [number, number, number, number];
	rotation?: number;
	cullface?: Direction;
	tintindex?: number;
}
export interface ModelElement {
	from: Vec3;
	to: Vec3;
	rotation?:
		& { origin: Vec3; rescale?: boolean; }
		& (
			| { axis: 'x' | 'y' | 'z'; angle: number; }
			| { x?: number; y?: number; z?: number; }
		);
	faces: Partial<Record<Direction, ModelFace>>;
}
export interface BlockModel {
	/** ゲーム側の専用描画が必要なbuiltinモデル。 */
	unsupported?: boolean;
	parent?: string;
	textures?: Record<string, string | { sprite: string; force_translucent?: boolean; }>;
	elements?: ModelElement[];
}
export interface ModelVariant {
	model: string;
	x?: number;
	y?: number;
	uvlock?: boolean;
	weight?: number;
}
export type Condition = { [key: string]: string | Condition[]; };
export interface BlockDefinition {
	variants?: Record<string, ModelVariant | ModelVariant[]>;
	multipart?: { when?: Condition; apply: ModelVariant | ModelVariant[]; }[];
}
export interface TextureAnimation {
	width?: number;
	height?: number;
	frames?: (number | { index: number; time?: number; })[];
}
export interface PackManifest {
	defaultStates?: Record<string, Record<string, string>>;
	format: 1;
	minecraftVersion: string | null;
	blockstates: string[];
	animations?: Record<string, TextureAnimation>;
}
export interface ResourceTexture {
	name: string;
	png: Uint8Array<ArrayBuffer>;
	alphaMode: AlphaMode;
}
export interface ResourceMaterial {
	key: string;
	texture?: ResourceTexture;
	alphaMode: AlphaMode;
}
export interface ResolvedVariant extends ModelVariant {
	definition: BlockModel;
}
export interface CompiledFace {
	forceTranslucent?: boolean;
	positions: Vec3[];
	uvs: [number, number][];
	cullface?: Direction;
	texture: string;
	tinted: boolean;
}
export const DIRECTIONS: Record<Direction, Vec3> = {
	down: [0, -1, 0],
	up: [0, 1, 0],
	north: [0, 0, -1],
	south: [0, 0, 1],
	west: [-1, 0, 0],
	east: [1, 0, 0]
};
export const resourceId = (value: string) => {
	const id = value.includes(':') ? value : `minecraft:${value}`;
	if (
		!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id)
		|| id.split(/[:/]/).some((part) => part === '..' || part === '.' || !part)
	) {
		throw new Error(`Minecraft素材の識別子が不正です: ${value}`);
	}
	return id;
};
export const resourcePath = (kind: 'models' | 'blockstates' | 'textures', id: string) => {
	const [namespace, path] = resourceId(id).split(':');
	return `assets/${namespace}/${kind}/${path}.${kind === 'textures' ? 'png' : 'json'}`;
};
