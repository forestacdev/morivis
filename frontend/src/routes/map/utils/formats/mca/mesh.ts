import { blockColor, linearColor } from './colors';
import { createMcaFaceLimitError, resolveMcaMaxFaces } from './limits';
import type { ResourceMaterial } from './resources/types';
import { type McaProgress, type McaRegion, type McaSection, sectionKey } from './types';

export interface McaMesh {
	positions: Float32Array<ArrayBuffer>;
	normals: Float32Array<ArrayBuffer>;
	colors: Uint8Array<ArrayBuffer>;
	indices: Uint32Array<ArrayBuffer>;
	faceCount: number;
	uvs?: Float32Array<ArrayBuffer>;
	groups?: { start: number; count: number; material: ResourceMaterial; }[];
	origin: number[];
	min: number[];
	max: number[];
}

export const MAX_MCA_FACES = resolveMcaMaxFaces();

/** 隣接sectionも参照して内部面を除き、同じブロックの連続面を矩形にまとめる。 */
export const meshMcaRegion = (
	region: McaRegion,
	onProgress?: (progress: McaProgress) => void,
	maxFaces = MAX_MCA_FACES
): McaMesh => {
	if (!region.sections.size) throw new Error('指定範囲に表示できるブロックがありません');
	const origin = [Infinity, Infinity, Infinity];
	for (const section of region.sections.values()) {
		origin[0] = Math.min(origin[0], section.x * 16);
		origin[1] = Math.min(origin[1], section.y * 16);
		origin[2] = Math.min(origin[2], section.z * 16);
	}
	let capacity = Math.min(4096, maxFaces);
	let positions = new Float32Array(capacity * 12);
	let normals = new Float32Array(capacity * 12);
	let colors = new Uint8Array(capacity * 16);
	let indices = new Uint32Array(capacity * 6);
	let faceCount = 0;
	const min = [Infinity, Infinity, Infinity];
	const max = [-Infinity, -Infinity, -Infinity];
	const paletteColors = region.palette.map((name) => linearColor(blockColor(name)));
	const reserve = () => {
		if (faceCount >= maxFaces) {
			throw createMcaFaceLimitError(maxFaces);
		}
		if (faceCount < capacity) return;
		capacity = Math.min(maxFaces, capacity * 2);
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
	// ハーフブロックを含む場合だけYを半ブロック単位で走査する。
	// ブロック配列は複製せず、元のパレットと形状から占有部分を参照する。
	const yScale = region.shapes?.some((shape) => shape !== 'cube') ? 2 : 1;
	const dimensions = [16, 16 * yScale, 16];
	const at = (section: McaSection | undefined, x: number, y: number, z: number) => {
		if (!section) return 0;
		const id = typeof section.blocks === 'number'
			? section.blocks
			: section.blocks[Math.floor(y / yScale) * 256 + z * 16 + x];
		const shape = region.shapes?.[id];
		if (shape === 'slab-bottom' && y % 2 === 1) return 0;
		if (shape === 'slab-top' && y % 2 === 0) return 0;
		return id;
	};
	const mask = new Uint16Array(256 * yScale);
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
				const depthSize = dimensions[axis];
				const widthSize = dimensions[u];
				const heightSize = dimensions[v];
				for (let depth = 0; depth < depthSize; depth++) {
					// 一様なsectionの内部には露出面がない。
					if (
						typeof section.blocks === 'number'
						&& (region.shapes?.[section.blocks] ?? 'cube') === 'cube'
						&& depth + sign >= 0 && depth + sign < depthSize
					) continue;
					const p = [0, 0, 0];
					p[axis] = depth;
					for (let j = 0; j < heightSize; j++) {
						p[v] = j;
						for (let i = 0; i < widthSize; i++) {
							p[u] = i;
							const id = at(section, p[0], p[1], p[2]);
							let adjacent = 0;
							if (id) {
								p[axis] = (depth + sign + depthSize) % depthSize;
								adjacent = at(
									depth + sign < 0 || depth + sign >= depthSize
										? neighbor
										: section,
									p[0],
									p[1],
									p[2]
								);
								p[axis] = depth;
							}
							mask[j * widthSize + i] = adjacent ? 0 : id;
						}
					}
					for (let j = 0; j < heightSize; j++) {
						for (let i = 0; i < widthSize;) {
							const id = mask[j * widthSize + i];
							if (!id) {
								i++;
								continue;
							}
							let width = 1;
							while (
								i + width < widthSize && mask[j * widthSize + i + width] === id
							) width++;
							let height = 1;
							let matches = true;
							while (j + height < heightSize && matches) {
								for (let k = 0; k < width; k++) {
									if (mask[(j + height) * widthSize + i + k] !== id) {
										matches = false;
										break;
									}
								}
								if (matches) height++;
							}
							reserve();
							const corners = [[0, 0], [width, 0], [width, height], [0, height]];
							for (let corner = 0; corner < 4; corner++) {
								const point = [0, 0, 0];
								point[axis] += depth + (sign > 0 ? 1 : 0);
								point[u] += i + corners[corner][0];
								point[v] += j + corners[corner][1];
								point[1] /= yScale;
								for (let a = 0; a < 3; a++) point[a] += base[a];
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
								mask.fill(
									0,
									(j + row) * widthSize + i,
									(j + row) * widthSize + i + width
								);
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
	// 一括取り込みで各リージョンの未使用capacityを保持し続けない。
	return {
		positions: positions.slice(0, faceCount * 12),
		normals: normals.slice(0, faceCount * 12),
		colors: colors.slice(0, faceCount * 16),
		indices: indices.slice(0, faceCount * 6),
		faceCount,
		origin,
		min,
		max
	};
};
