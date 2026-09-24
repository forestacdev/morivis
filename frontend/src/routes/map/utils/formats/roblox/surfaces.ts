import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { RobloxPart, RobloxTexture } from './world';

// NormalId順: Right / Top / Back / Left / Bottom / Front。Uは右、Vは画像の下方向。
const faces = [
	{ n: [1, 0, 0], u: [0, 0, -1], v: [0, -1, 0] },
	{ n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] },
	{ n: [0, 0, 1], u: [1, 0, 0], v: [0, -1, 0] },
	{ n: [-1, 0, 0], u: [0, 0, 1], v: [0, -1, 0] },
	{ n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, -1] },
	{ n: [0, 0, -1], u: [-1, 0, 0], v: [0, -1, 0] }
];

export const robloxSurfaceGeometry = (part: RobloxPart, texture: RobloxTexture, order: number) => {
	const { n, u, v } = faces[texture.face];
	const normal = new Vector3(...n), right = new Vector3(...u), down = new Vector3(...v);
	const size = new Vector3(...part.size);
	const width = Math.abs(right.dot(size)), height = Math.abs(down.dot(size));
	const depth = Math.abs(normal.dot(size));
	// ZIndex順にわずかに浮かせる。パーツサイズが違っても同じstud量になる。
	const lift = texture.baked ? 0 : Math.min(...part.size) * 0.002 * (order + 1) / depth;
	const positions: number[] = [], normals: number[] = [], uvs: number[] = [];
	const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
	for (const index of [0, 2, 1, 0, 3, 2]) {
		const [x, y] = corners[index];
		positions.push(
			...normal.clone().multiplyScalar(0.5 + lift)
				.addScaledVector(right, x - 0.5).addScaledVector(down, y - 0.5).toArray()
		);
		normals.push(...n);
		uvs.push(
			texture.tile ? (x * width - texture.offset[0]) / texture.tile[0] : x,
			texture.tile ? (y * height - texture.offset[1]) / texture.tile[1] : y
		);
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
	geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
	return geometry;
};
