import { resolveTexture } from './models';
import {
	type CompiledFace,
	type Direction,
	DIRECTIONS,
	type ModelElement,
	type ResolvedVariant,
	type Vec3
} from './types';

const rotate = (p: Vec3, axis: number, degrees: number, origin: Vec3): Vec3 => {
	const radians = degrees * Math.PI / 180;
	const u = (axis + 1) % 3;
	const v = (axis + 2) % 3;
	const point = p.map((value, i) => value - origin[i]) as Vec3;
	const a = point[u], b = point[v];
	point[u] = a * Math.cos(radians) - b * Math.sin(radians);
	point[v] = a * Math.sin(radians) + b * Math.cos(radians);
	return point.map((value, i) => value + origin[i]) as Vec3;
};
export const rotateVariant = (
	p: Vec3,
	variant: Pick<ResolvedVariant, 'x' | 'y'>,
	origin: Vec3 = [0.5, 0.5, 0.5]
) => rotate(rotate(p, 0, -(variant.x ?? 0), origin), 1, -(variant.y ?? 0), origin);
export const rotatedDirection = (direction: Direction, variant: ResolvedVariant): Direction => {
	const p = rotateVariant(DIRECTIONS[direction], variant, [0, 0, 0]);
	return (Object.keys(DIRECTIONS) as Direction[]).find((key) =>
		DIRECTIONS[key].every((value, i) => Math.abs(value - p[i]) < 0.00001)
	)!;
};
const corners = (from: Vec3, to: Vec3): Record<Direction, Vec3[]> => {
	const [x, y, z] = from, [X, Y, Z] = to;
	return {
		down: [[x, y, Z], [x, y, z], [X, y, z], [X, y, Z]],
		up: [[x, Y, z], [x, Y, Z], [X, Y, Z], [X, Y, z]],
		north: [[X, Y, z], [X, y, z], [x, y, z], [x, Y, z]],
		south: [[x, Y, Z], [x, y, Z], [X, y, Z], [X, Y, Z]],
		west: [[x, Y, z], [x, y, z], [x, y, Z], [x, Y, Z]],
		east: [[X, Y, Z], [X, y, Z], [X, y, z], [X, Y, z]]
	};
};
const defaultUv = (
	{ from: [x, y, z], to: [X, Y, Z] }: ModelElement
): Record<Direction, [number, number, number, number]> => ({
	down: [x, 16 - Z, X, 16 - z],
	up: [x, z, X, Z],
	north: [16 - X, 16 - Y, 16 - x, 16 - y],
	south: [x, 16 - Y, X, 16 - y],
	west: [z, 16 - Y, Z, 16 - y],
	east: [16 - Z, 16 - Y, 16 - z, 16 - y]
});
const unitCorners = corners([0, 0, 0], [1, 1, 1]);
const subtract = (a: Vec3, b: Vec3): Vec3 => a.map((value, i) => value - b[i]) as Vec3;
const dot = (a: Vec3, b: Vec3) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const isVector = (value: unknown): value is Vec3 =>
	Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

const elementTransform = (rotation: ModelElement['rotation'], model: string) => {
	if (!rotation) return (p: Vec3) => p;
	const singleAxis = 'axis' in rotation || 'angle' in rotation;
	const angles: Vec3 = [0, 0, 0];
	if (singleAxis) {
		if (
			!('axis' in rotation) || !['x', 'y', 'z'].includes(rotation.axis)
			|| !Number.isFinite(rotation.angle)
		) {
			throw new Error(`モデルの回転が不正です: ${model}`);
		}
		angles[['x', 'y', 'z'].indexOf(rotation.axis)] = rotation.angle;
	} else {
		angles[0] = rotation.x ?? 0;
		angles[1] = rotation.y ?? 0;
		angles[2] = rotation.z ?? 0;
	}
	if (!isVector(rotation.origin) || !angles.every(Number.isFinite)) {
		throw new Error(`モデルの回転が不正です: ${model}`);
	}
	// Euler形式は Rz * Ry * Rx。rescaleは各ローカル軸を回転前に伸ばす。
	const rotateLocal = (p: Vec3) =>
		angles.reduce(
			(point, angle, axis) => rotate(point, axis, angle, [0, 0, 0]),
			p
		);
	const scale = angles.map((_, axis) => {
		if (!rotation.rescale) return 1;
		const basis: Vec3 = [0, 0, 0];
		basis[axis] = 1;
		return 1 / Math.max(...rotateLocal(basis).map(Math.abs));
	});
	return (p: Vec3): Vec3 => {
		const local = p.map((v, i) => (v - rotation.origin[i]) * scale[i]) as Vec3;
		return rotateLocal(local).map((v, i) => v + rotation.origin[i]) as Vec3;
	};
};

export const compileVariant = (variant: ResolvedVariant): CompiledFace[] => {
	const faces: CompiledFace[] = [];
	for (const element of variant.definition.elements ?? []) {
		if (
			!isVector(element.from) || !isVector(element.to)
			|| !element.faces
		) {
			throw new Error(`モデルの寸法が不正です: ${variant.model}`);
		}
		const transform = elementTransform(element.rotation, variant.model);
		const vertices = corners(element.from, element.to);
		for (const [key, face] of Object.entries(element.faces)) {
			const direction = key as Direction;
			if (
				!Object.hasOwn(DIRECTIONS, direction) || !face || typeof face.texture !== 'string'
				|| !Number.isFinite(face.rotation ?? 0) || (face.rotation ?? 0) % 90 !== 0
				|| (face.cullface && !Object.hasOwn(DIRECTIONS, face.cullface))
			) {
				throw new Error(`モデルの面指定が不正です: ${variant.model}`);
			}
			const uv = face.uv ?? defaultUv(element)[direction];
			if (!Array.isArray(uv) || uv.length !== 4 || !uv.every(Number.isFinite)) {
				throw new Error('モデルのUVが不正です');
			}
			const [u0, v0, u1, v1] = uv.map((v) => v / 16);
			const raw: [number, number][] = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
			const steps = (((face.rotation ?? 0) / 90) % 4 + 4) % 4;
			let uvs = raw.map((_, i) => raw[(i + steps) % 4]);
			if (variant.uvlock) {
				const original = unitCorners[direction];
				const target = unitCorners[rotatedDirection(direction, variant)];
				const u = rotateVariant(subtract(original[3], original[0]), variant, [0, 0, 0]);
				const v = rotateVariant(subtract(original[1], original[0]), variant, [0, 0, 0]);
				const tu = subtract(target[3], target[0]), tv = subtract(target[1], target[0]);
				const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
				uvs = uvs.map((
					[a, b]
				) => [
					cu + (a - cu) * dot(u, tu) + (b - cv) * dot(v, tu),
					cv + (a - cu) * dot(u, tv) + (b - cv) * dot(v, tv)
				]);
			}
			const positions = vertices[direction].map((p) => {
				p = transform(p);
				return rotateVariant(p.map((v) => v / 16) as Vec3, variant);
			});
			faces.push({
				positions,
				uvs,
				...resolveTexture(variant.definition, face.texture),
				cullface: face.cullface ? rotatedDirection(face.cullface, variant) : undefined,
				tinted: face.tintindex !== undefined && face.tintindex >= 0
			});
		}
	}
	return faces;
};
