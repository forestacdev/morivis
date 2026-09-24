import { blockColor, linearColor } from '../colors';
import { createMcaFaceLimitError } from '../limits';
import type { McaMesh } from '../mesh';
import { type McaProgress, type McaRegion, sectionKey } from '../types';
import { isWaterBlock, waterMaterial } from '../water';
import { compileVariant } from './geometry';
import { chooseVariant } from './models';
import type { MinecraftResourcePack } from './pack';
import {
	type CompiledFace,
	type Direction,
	DIRECTIONS,
	type ResourceMaterial,
	type Vec3
} from './types';

type Face = CompiledFace & { material: ResourceMaterial; color: [number, number, number, number]; };
type Variant = { weight?: number; faces: Face[]; };
const directions = Object.keys(DIRECTIONS) as Direction[];
const white: [number, number, number, number] = [255, 255, 255, 255];
const fallback = (region: McaRegion, id: number): Variant[][] => {
	const shape = region.shapes?.[id];
	const y0 = shape === 'slab-top' ? 8 : 0, y1 = shape === 'slab-bottom' ? 8 : 16;
	const material: ResourceMaterial = isWaterBlock(region.palette[id])
		? waterMaterial
		: { key: 'fallback', alphaMode: 'OPAQUE' };
	const color = linearColor(blockColor(region.palette[id]));
	return [[{
		faces: compileVariant({
			model: 'morivis:fallback',
			definition: {
				elements: [{
					from: [0, y0, 0],
					to: [16, y1, 16],
					faces: Object.fromEntries(
						directions.map((
							direction
						) => [direction, { texture: 'morivis:fallback', cullface: direction }])
					)
				}]
			}
		}).map((face) => ({ ...face, material, color }))
	}]];
};

const buildModels = async (region: McaRegion, pack: MinecraftResourcePack) => {
	const templates: Variant[][][] = new Array(region.palette.length);
	let next = 1;
	// 素材の並列リクエスト数を抑え、同じモデル・画像はpack内のキャッシュを共有する。
	await Promise.all(Array.from({ length: Math.min(8, region.palette.length - 1) }, async () => {
		while (next < region.palette.length) {
			const id = next++;
			const variants = await pack.variants(region.palette[id], region.states?.[id] ?? {});
			if (variants === null) {
				templates[id] = fallback(region, id);
				continue;
			}
			templates[id] = await Promise.all(
				variants.map((group) =>
					Promise.all(group.map(async (variant) => {
						const faces: Face[] = [];
						for (const face of compileVariant(variant)) {
							const texture = await pack.texture(face.texture);
							faces.push({
								...face,
								material: {
									key: face.forceTranslucent
										? `${texture.name}:translucent`
										: texture.name,
									texture,
									alphaMode: face.forceTranslucent ? 'BLEND' : texture.alphaMode
								},
								color: face.tinted
									? linearColor(blockColor(region.palette[id]))
									: white
							});
						}
						return { weight: variant.weight, faces };
					}))
				)
			);
		}
	}));
	return templates;
};
const modelTemplates = new WeakMap<
	MinecraftResourcePack,
	{ key: string; value: Promise<Variant[][][]>; }
>();
const prepareModels = (region: McaRegion, pack: MinecraftResourcePack) => {
	const key = JSON.stringify([region.palette, region.states, region.shapes]);
	const cached = modelTemplates.get(pack);
	if (cached?.key === key) return cached.value;
	const value = buildModels(region, pack);
	modelTemplates.set(pack, { key, value });
	return value;
};
const normal = (p: Vec3[]): Vec3 => {
	const a = p[1].map((v, i) => v - p[0][i]), b = p[2].map((v, i) => v - p[0][i]);
	const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
	const length = Math.hypot(...cross);
	return cross.map((v) => length ? v / length : 0) as Vec3;
};
const faceNormals = new WeakMap<Face, Vec3>();
const faceNormal = (face: Face) => {
	let result = faceNormals.get(face);
	if (!result) {
		result = normal(face.positions);
		faceNormals.set(face, result);
	}
	return result;
};
const epsilon = 0.00001;
const faceIsCovered = (face: Face, neighbor: Face[], identical: boolean) => {
	if (!face.cullface) return false;
	const direction = DIRECTIONS[face.cullface];
	const axis = direction.findIndex((v) => v !== 0), sign = direction[axis];
	const plane = sign > 0 ? 1 : 0;
	if (!face.positions.every((p) => Math.abs(p[axis] - plane) < epsilon)) return false;
	const u = (axis + 1) % 3, v = (axis + 2) % 3;
	return neighbor.some((other) => {
		if (
			other.material.alphaMode !== 'OPAQUE' && !(identical && face.texture === other.texture)
		) return false;
		if (!other.positions.every((p) => Math.abs(p[axis] - (1 - plane)) < epsilon)) return false;
		if (faceNormal(other)[axis] * sign > -0.999) return false;
		// 回転した菱形などを外接矩形で覆ったとみなさない。
		if (
			![u, v].every((dimension) => {
				const lo = Math.min(...other.positions.map((p) => p[dimension]));
				const hi = Math.max(...other.positions.map((p) => p[dimension]));
				return hi - lo > epsilon
					&& other.positions.every((p) =>
						Math.abs(p[dimension] - lo) < epsilon
						|| Math.abs(p[dimension] - hi) < epsilon
					);
			})
		) return false;
		return [u, v].every((dimension) =>
			Math.min(...other.positions.map((p) => p[dimension]))
				<= Math.min(...face.positions.map((p) => p[dimension])) + epsilon
			&& Math.max(...other.positions.map((p) => p[dimension]))
				>= Math.max(...face.positions.map((p) => p[dimension])) - epsilon
		);
	});
};

export const meshResourceRegion = async (
	region: McaRegion,
	pack: MinecraftResourcePack,
	onProgress?: (progress: McaProgress) => void,
	maxFaces = Infinity,
	ownedSections?: Set<string>
): Promise<McaMesh> => {
	const templates = await prepareModels(region, pack);
	const staticFaces: (Face[] | undefined)[] = templates.map((groups) =>
		groups.every((variants) => variants.length === 1)
			? groups.flatMap((variants) => variants[0].faces)
			: undefined
	);
	staticFaces[0] = [];
	const coverage = [
		new WeakMap<Face, WeakMap<Face[], boolean>>(),
		new WeakMap<Face, WeakMap<Face[], boolean>>()
	];
	const origin = [Infinity, Infinity, Infinity];
	for (const section of region.sections.values()) {
		[section.x, section.y, section.z].forEach((value, i) => {
			origin[i] = Math.min(origin[i], value * 16);
		});
	}
	const at = (x: number, y: number, z: number) => {
		const sx = Math.floor(x / 16), sy = Math.floor(y / 16), sz = Math.floor(z / 16);
		const section = region.sections.get(sectionKey(sx, sy, sz));
		const id = !section ? 0 : typeof section.blocks === 'number'
			? section.blocks
			: section.blocks[(y - sy * 16) * 256 + (z - sz * 16) * 16 + x - sx * 16];
		const faces = staticFaces[id] ?? (id
			? templates[id].flatMap((variants, index) =>
				chooseVariant(variants, x, y, z, index).faces
			)
			: []);
		return { id, faces };
	};
	const covered = (face: Face, neighbor: ReturnType<typeof at>, identical: boolean) => {
		if (!neighbor.faces.length) return false;
		if (neighbor.faces !== staticFaces[neighbor.id]) {
			return faceIsCovered(face, neighbor.faces, identical);
		}
		const cache = coverage[Number(identical)];
		let neighbors = cache.get(face);
		if (!neighbors) {
			neighbors = new WeakMap();
			cache.set(face, neighbors);
		}
		let value = neighbors.get(neighbor.faces);
		if (value === undefined) {
			value = faceIsCovered(face, neighbor.faces, identical);
			neighbors.set(neighbor.faces, value);
		}
		return value;
	};
	let capacity = Math.min(4096, maxFaces), faceCount = 0;
	let positions = new Float32Array(capacity * 12), normals = new Float32Array(capacity * 12);
	let colors = new Uint8Array(capacity * 16), uvs = new Float32Array(capacity * 8);
	const groups = new Map<string, { material: ResourceMaterial; faces: number[]; }>();
	const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
	const reserve = () => {
		if (faceCount >= maxFaces) throw createMcaFaceLimitError(maxFaces);
		if (faceCount < capacity) return;
		capacity = Math.min(maxFaces, capacity * 2);
		const p = new Float32Array(capacity * 12);
		p.set(positions);
		positions = p;
		const n = new Float32Array(capacity * 12);
		n.set(normals);
		normals = n;
		const c = new Uint8Array(capacity * 16);
		c.set(colors);
		colors = c;
		const uv = new Float32Array(capacity * 8);
		uv.set(uvs);
		uvs = uv;
	};
	let completed = 0;
	for (const section of region.sections.values()) {
		if (ownedSections && !ownedSections.has(sectionKey(section.x, section.y, section.z))) {
			continue;
		}
		for (let y = 0; y < 16; y++) {
			for (let z = 0; z < 16; z++) {
				for (let x = 0; x < 16; x++) {
					const wx = section.x * 16 + x, wy = section.y * 16 + y, wz = section.z * 16 + z;
					const block = at(wx, wy, wz);
					if (!block.id) continue;
					const neighbors = new Map<Direction, ReturnType<typeof at>>();
					for (const face of block.faces) {
						if (face.cullface) {
							let neighbor = neighbors.get(face.cullface);
							if (!neighbor) {
								const [dx, dy, dz] = DIRECTIONS[face.cullface];
								neighbor = at(wx + dx, wy + dy, wz + dz);
								neighbors.set(face.cullface, neighbor);
							}
							if (
								covered(
									face,
									neighbor,
									region.palette[block.id] === region.palette[neighbor.id]
										|| (isWaterBlock(region.palette[block.id])
											&& isWaterBlock(region.palette[neighbor.id]))
								)
							) continue;
						}
						const n = faceNormal(face);
						if (n.every((v) => v === 0)) continue;
						reserve();
						for (let vertex = 0; vertex < 4; vertex++) {
							const p = face.positions[vertex].map((v, i) =>
								v + [wx, wy, wz][i] - origin[i]
							);
							positions.set(p, faceCount * 12 + vertex * 3);
							normals.set(n, faceCount * 12 + vertex * 3);
							colors.set(face.color, faceCount * 16 + vertex * 4);
							uvs.set(face.uvs[vertex], faceCount * 8 + vertex * 2);
							for (let axis = 0; axis < 3; axis++) {
								min[axis] = Math.min(min[axis], p[axis]);
								max[axis] = Math.max(max[axis], p[axis]);
							}
						}
						let group = groups.get(face.material.key);
						if (!group) {
							group = { material: face.material, faces: [] };
							groups.set(face.material.key, group);
						}
						group.faces.push(faceCount++);
					}
				}
			}
		}
		onProgress?.({
			stage: 'mesh',
			completed: ++completed,
			total: ownedSections?.size ?? region.sections.size
		});
	}
	if (!faceCount && !ownedSections) throw new Error('指定範囲に表示できるブロックがありません');
	const indices = new Uint32Array(faceCount * 6);
	let offset = 0;
	const ranges = [...groups.values()].map(({ material, faces }) => {
		const start = offset;
		for (const face of faces) {
			indices.set([0, 1, 2, 0, 2, 3].map((i) => face * 4 + i), offset);
			offset += 6;
		}
		return { start, count: offset - start, material };
	});
	return {
		positions: positions.slice(0, faceCount * 12),
		normals: normals.slice(0, faceCount * 12),
		colors: colors.slice(0, faceCount * 16),
		uvs: uvs.slice(0, faceCount * 8),
		indices,
		groups: ranges,
		faceCount,
		origin,
		min,
		max
	};
};
