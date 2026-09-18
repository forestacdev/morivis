import { blockColor, linearColor } from './colors';
import { type McaProgress, type McaRegion, type McaSection, sectionKey } from './types';

export interface McaMesh {
	positions: Float32Array<ArrayBuffer>;
	normals: Float32Array<ArrayBuffer>;
	colors: Uint8Array<ArrayBuffer>;
	indices: Uint32Array<ArrayBuffer>;
	faceCount: number;
	origin: number[];
	min: number[];
	max: number[];
}

export const MAX_MCA_FACES = 500_000;

/** 隣接sectionも参照して内部面を除き、同じブロックの連続面を矩形にまとめる。 */
export const meshMcaRegion = (
	region: McaRegion,
	onProgress?: (progress: McaProgress) => void
): McaMesh => {
	if (!region.sections.size) throw new Error('指定範囲に表示できるブロックがありません');
	const origin = [Infinity, Infinity, Infinity];
	for (const section of region.sections.values()) {
		origin[0] = Math.min(origin[0], section.x * 16);
		origin[1] = Math.min(origin[1], section.y * 16);
		origin[2] = Math.min(origin[2], section.z * 16);
	}
	let capacity = 4096;
	let positions = new Float32Array(capacity * 12);
	let normals = new Float32Array(capacity * 12);
	let colors = new Uint8Array(capacity * 16);
	let indices = new Uint32Array(capacity * 6);
	let faceCount = 0;
	const min = [Infinity, Infinity, Infinity];
	const max = [-Infinity, -Infinity, -Infinity];
	const paletteColors = region.palette.map((name) => linearColor(blockColor(name)));
	const reserve = () => {
		if (faceCount >= MAX_MCA_FACES) {
			throw new Error('表示する面が多すぎます。チャンク範囲を狭めてください');
		}
		if (faceCount < capacity) return;
		capacity = Math.min(MAX_MCA_FACES, capacity * 2);
		const nextPositions = new Float32Array(capacity * 12);
		nextPositions.set(positions);
		positions = nextPositions;
		const nextNormals = new Float32Array(capacity * 12);
		nextNormals.set(normals);
		normals = nextNormals;
		const nextColors = new Uint8Array(capacity * 16);
		nextColors.set(colors);
		colors = nextColors;
		const nextIndices = new Uint32Array(capacity * 6);
		nextIndices.set(indices);
		indices = nextIndices;
	};
	const at = (section: McaSection | undefined, x: number, y: number, z: number) =>
		!section
			? 0
			: typeof section.blocks === 'number'
			? section.blocks
			: section.blocks[y * 256 + z * 16 + x];
	const mask = new Uint16Array(256);
	let completed = 0;
	for (const section of region.sections.values()) {
		const base = [
			section.x * 16 - origin[0],
			section.y * 16 - origin[1],
			section.z * 16 - origin[2]
		];
		for (let axis = 0; axis < 3; axis++) {
			const u = (axis + 1) % 3;
			const v = (axis + 2) % 3;
			for (const sign of [-1, 1]) {
				const neighborPos = [section.x, section.y, section.z];
				neighborPos[axis] += sign;
				const neighbor = region.sections.get(
					sectionKey(neighborPos[0], neighborPos[1], neighborPos[2])
				);
				for (let depth = 0; depth < 16; depth++) {
					// 一様なsectionの内部には露出面がない。
					if (
						typeof section.blocks === 'number' && depth + sign >= 0 && depth + sign < 16
					) continue;
					const p = [0, 0, 0];
					p[axis] = depth;
					for (let j = 0; j < 16; j++) {
						p[v] = j;
						for (let i = 0; i < 16; i++) {
							p[u] = i;
							const id = at(section, p[0], p[1], p[2]);
							let adjacent = 0;
							if (id) {
								p[axis] = (depth + sign + 16) % 16;
								adjacent = at(
									depth + sign < 0 || depth + sign > 15 ? neighbor : section,
									p[0],
									p[1],
									p[2]
								);
								p[axis] = depth;
							}
							mask[j * 16 + i] = adjacent ? 0 : id;
						}
					}
					for (let j = 0; j < 16; j++) {
						for (let i = 0; i < 16;) {
							const id = mask[j * 16 + i];
							if (!id) {
								i++;
								continue;
							}
							let width = 1;
							while (i + width < 16 && mask[j * 16 + i + width] === id) width++;
							let height = 1;
							let matches = true;
							while (j + height < 16 && matches) {
								for (let k = 0; k < width; k++) {
									if (mask[(j + height) * 16 + i + k] !== id) {
										matches = false;
										break;
									}
								}
								if (matches) height++;
							}
							reserve();
							const corners = [[0, 0], [width, 0], [width, height], [0, height]];
							for (let corner = 0; corner < 4; corner++) {
								const point = [...base];
								point[axis] += depth + (sign > 0 ? 1 : 0);
								point[u] += i + corners[corner][0];
								point[v] += j + corners[corner][1];
								const offset = faceCount * 12 + corner * 3;
								positions.set(point, offset);
								normals[offset + axis] = sign;
								colors.set(paletteColors[id], faceCount * 16 + corner * 4);
								for (let a = 0; a < 3; a++) {
									min[a] = Math.min(min[a], point[a]);
									max[a] = Math.max(max[a], point[a]);
								}
							}
							const order = sign > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
							indices.set(order.map((n) => faceCount * 4 + n), faceCount * 6);
							faceCount++;
							for (let row = 0; row < height; row++) {
								mask.fill(0, (j + row) * 16 + i, (j + row) * 16 + i + width);
							}
							i += width;
						}
					}
				}
			}
		}
		onProgress?.({ stage: 'mesh', completed: ++completed, total: region.sections.size });
	}
	if (!faceCount) throw new Error('指定範囲に表示できるブロックがありません');
	return {
		positions: positions.subarray(0, faceCount * 12),
		normals: normals.subarray(0, faceCount * 12),
		colors: colors.subarray(0, faceCount * 16),
		indices: indices.subarray(0, faceCount * 6),
		faceCount,
		origin,
		min,
		max
	};
};
