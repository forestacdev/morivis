import { BufferAttribute, BufferGeometry } from 'three';

import type { PointCloudSurfaceInput } from './surface-core';

/** A height field: retain the highest sample at each XY grid node, without filling gaps. */
export const buildTerrainSurface = (
	{ positions, colors, resolution }: PointCloudSurfaceInput,
	progress: (message: string) => void = () => {}
) => {
	if (!Number.isInteger(resolution) || resolution < 32 || resolution > 192) {
		throw new Error('メッシュの細かさは 32〜192 で指定してください');
	}
	if (
		positions.length < 9 || positions.length % 3
		|| (colors && colors.length !== positions.length)
	) {
		throw new Error('点群の座標とRGBの数を確認してください');
	}
	const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
	const valid = (i: number) =>
		Number.isFinite(positions[i]) && Number.isFinite(positions[i + 1])
		&& Number.isFinite(positions[i + 2]);
	for (let i = 0; i < positions.length; i += 3) {
		if (!valid(i)) continue;
		for (let a = 0; a < 2; a++) {
			min[a] = Math.min(min[a], positions[i + a]);
			max[a] = Math.max(max[a], positions[i + a]);
		}
	}
	const span = Math.max(max[0] - min[0], max[1] - min[1]);
	if (!Number.isFinite(span) || max[0] <= min[0] || max[1] <= min[1]) {
		throw new Error('XY方向に広がりのある点群が必要です');
	}
	const cellSize = span / (resolution * 4);
	const width = Math.round((max[0] - min[0]) / cellSize) + 1;
	const height = Math.round((max[1] - min[1]) / cellSize) + 1;
	const selected = new Int32Array(width * height).fill(-1);
	progress('格子ごとに一番高い点を選んでいます');
	for (let i = 0; i < positions.length; i += 3) {
		if (!valid(i)) continue;
		const x = Math.round((positions[i] - min[0]) / cellSize),
			y = Math.round((positions[i + 1] - min[1]) / cellSize);
		const node = x + y * width, previous = selected[node];
		if (previous < 0 || positions[i + 2] > positions[previous + 2]) selected[node] = i;
	}
	let count = 0;
	for (const id of selected) if (id >= 0) count++;
	const vertices = new Float32Array(count * 3), palette = new Float32Array(count * 3);
	const nodeVertices = new Int32Array(selected.length).fill(-1);
	let vertex = 0;
	for (let node = 0; node < selected.length; node++) {
		const source = selected[node];
		if (source < 0) continue;
		nodeVertices[node] = vertex;
		vertices[vertex * 3] = min[0] + (node % width) * cellSize;
		vertices[vertex * 3 + 1] = positions[source + 2];
		vertices[vertex * 3 + 2] = -(min[1] + Math.floor(node / width) * cellSize);
		for (let a = 0; a < 3; a++) {
			const srgb = colors ? colors[source + a] / 255 : undefined;
			palette[vertex * 3 + a] = srgb === undefined
				? 0.7
				: srgb <= 0.04045
				? srgb / 12.92
				: ((srgb + 0.055) / 1.055) ** 2.4;
		}
		vertex++;
	}
	progress('地形の面をつないでいます');
	const indices: number[] = [];
	for (let y = 0; y < height - 1; y++) {
		for (let x = 0; x < width - 1; x++) {
			const node = x + y * width;
			const a = nodeVertices[node],
				b = nodeVertices[node + 1],
				c = nodeVertices[node + width],
				d = nodeVertices[node + width + 1];
			// Only connect complete neighboring grid squares. Never bridge an empty node.
			if (a < 0 || b < 0 || c < 0 || d < 0) continue;
			if (
				Math.abs(vertices[a * 3 + 1] - vertices[d * 3 + 1])
					<= Math.abs(vertices[b * 3 + 1] - vertices[c * 3 + 1])
			) {
				indices.push(a, b, d, a, d, c);
			} else indices.push(a, b, c, b, d, c);
		}
	}
	if (!indices.length) {
		throw new Error(
			'隣り合う格子に点がないため面を作れませんでした。「細かさ」を下げてください'
		);
	}
	const indexArray = new Uint32Array(indices);
	const geometry = new BufferGeometry();
	try {
		geometry.setAttribute('position', new BufferAttribute(vertices, 3));
		geometry.setIndex(new BufferAttribute(indexArray, 1));
		geometry.computeVertexNormals();
		const normals = geometry.getAttribute('normal').array as Float32Array;
		// Isolated nodes have no incident faces; keep their exported normals valid too.
		for (let i = 0; i < normals.length; i += 3) {
			if (normals[i] === 0 && normals[i + 1] === 0 && normals[i + 2] === 0) {
				normals[i + 1] = 1;
			}
		}
		return {
			chunks: [{
				positions: vertices,
				normals,
				colors: palette,
				indices: indexArray
			}],
			cellSize,
			triangleCount: indices.length / 3,
			occupiedCells: count
		};
	} finally {
		geometry.dispose();
	}
};
