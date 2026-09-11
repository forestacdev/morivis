const NEIGHBORS = 16;

/** Small balanced spatial index; queries never scan the complete cloud. */
export const createSurfacePointIndex = (points: Float32Array) => {
	const order = Int32Array.from({ length: points.length / 3 }, (_, i) => i);
	const build = (start: number, end: number, depth: number) => {
		if (end - start <= 1) return;
		const axis = depth % 3;
		order.subarray(start, end).sort((a, b) =>
			points[a * 3 + axis] - points[b * 3 + axis] || a - b
		);
		const middle = (start + end) >> 1;
		build(start, middle, depth + 1);
		build(middle + 1, end, depth + 1);
	};
	build(0, order.length, 0);
	return (x: number, y: number, z: number, count: number, exclude = -1) => {
		const found: { id: number; distance: number; }[] = [];
		const query = [x, y, z];
		const visit = (start: number, end: number, depth: number) => {
			if (start >= end) return;
			const middle = (start + end) >> 1;
			const id = order[middle];
			const offset = id * 3;
			const distance = (x - points[offset]) ** 2 + (y - points[offset + 1]) ** 2
				+ (z - points[offset + 2]) ** 2;
			if (
				id !== exclude
				&& (found.length < count || distance < found[found.length - 1].distance)
			) {
				let at = found.length;
				while (at > 0 && found[at - 1].distance > distance) at--;
				found.splice(at, 0, { id, distance });
				if (found.length > count) found.pop();
			}
			const delta = query[depth % 3] - points[offset + depth % 3];
			if (delta < 0) visit(start, middle, depth + 1);
			else visit(middle + 1, end, depth + 1);
			if (found.length < count || delta * delta <= found[found.length - 1].distance) {
				if (delta < 0) visit(middle + 1, end, depth + 1);
				else visit(start, middle, depth + 1);
			}
		};
		visit(0, order.length, 0);
		return found;
	};
};

/** Jacobi diagonalization of a symmetric 3x3 covariance matrix. */
const planeNormal = (matrix: number[]) => {
	const vectors = [1, 0, 0, 0, 1, 0, 0, 0, 1];
	for (let iteration = 0; iteration < 16; iteration++) {
		let p = 0, q = 1;
		for (const [a, b] of [[0, 2], [1, 2]]) {
			if (Math.abs(matrix[a * 3 + b]) > Math.abs(matrix[p * 3 + q])) {
				p = a;
				q = b;
			}
		}
		if (Math.abs(matrix[p * 3 + q]) < 1e-12) break;
		const angle = 0.5
			* Math.atan2(2 * matrix[p * 3 + q], matrix[q * 3 + q] - matrix[p * 3 + p]);
		const c = Math.cos(angle), s = Math.sin(angle);
		for (let k = 0; k < 3; k++) {
			const a = matrix[k * 3 + p], b = matrix[k * 3 + q];
			matrix[k * 3 + p] = c * a - s * b;
			matrix[k * 3 + q] = s * a + c * b;
			const va = vectors[k * 3 + p], vb = vectors[k * 3 + q];
			vectors[k * 3 + p] = c * va - s * vb;
			vectors[k * 3 + q] = s * va + c * vb;
		}
		for (let k = 0; k < 3; k++) {
			const a = matrix[p * 3 + k], b = matrix[q * 3 + k];
			matrix[p * 3 + k] = c * a - s * b;
			matrix[q * 3 + k] = s * a + c * b;
		}
	}
	const axes = [0, 1, 2].sort((a, b) => matrix[a * 3 + a] - matrix[b * 3 + b]);
	// A line or an isolated point does not determine a surface normal.
	if (matrix[axes[1] * 3 + axes[1]] <= Math.max(1e-10, matrix[axes[2] * 3 + axes[2]] * 1e-5)) {
		return [0, 0, 0];
	}
	return [vectors[axes[0]], vectors[3 + axes[0]], vectors[6 + axes[0]]];
};

/** Prefer a supported plane through the sample when a neighborhood crosses a crease. */
const creaseNormal = (deltas: number[][], initial: number[], spacing: number) => {
	const tolerance = Math.max(0.05, spacing * 0.15);
	const residual = (normal: number[], d: number[]) =>
		Math.abs(normal[0] * d[0] + normal[1] * d[1] + normal[2] * d[2]);
	if (deltas.every(d => residual(initial, d) <= tolerance)) return initial;
	let best = initial, bestCount = 0, bestError = Infinity;
	for (let i = 0; i < deltas.length; i++) {
		const a = deltas[i], b = deltas[(i + Math.floor(deltas.length / 2) + 1) % deltas.length];
		const normal = [
			a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0]
		];
		const length = Math.hypot(...normal);
		if (length < 1e-8) continue;
		for (let axis = 0; axis < 3; axis++) normal[axis] /= length;
		let count = 0, error = 0;
		for (const d of deltas) {
			const r = residual(normal, d);
			if (r <= tolerance) {
				count++;
				error += r * r;
			}
		}
		if (count > bestCount || (count === bestCount && error < bestError)) {
			best = normal;
			bestCount = count;
			bestError = error;
		}
	}
	return bestCount >= Math.max(6, Math.ceil(deltas.length * 0.6)) ? best : initial;
};

export const estimateSurfaceNormals = (points: Float32Array, preservePlanes = false) => {
	const count = points.length / 3;
	const nearest = createSurfacePointIndex(points);
	const normals = new Float32Array(points.length);
	const neighbors = new Int32Array(count * NEIGHBORS).fill(-1);
	const spacing = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		const ids = nearest(points[i * 3], points[i * 3 + 1], points[i * 3 + 2], NEIGHBORS, i);
		if (ids.length < 2) continue;
		spacing[i] = Math.sqrt(ids[0].distance);
		const mean = [points[i * 3], points[i * 3 + 1], points[i * 3 + 2]];
		ids.forEach(({ id }, j) => {
			neighbors[i * NEIGHBORS + j] = id;
			for (let axis = 0; axis < 3; axis++) mean[axis] += points[id * 3 + axis];
		});
		for (let axis = 0; axis < 3; axis++) mean[axis] /= ids.length + 1;
		const covariance = Array<number>(9).fill(0);
		for (const id of [i, ...ids.map(({ id }) => id)]) {
			const delta = mean.map((value, axis) => points[id * 3 + axis] - value);
			for (let a = 0; a < 3; a++) {
				for (let b = 0; b < 3; b++) covariance[a * 3 + b] += delta[a] * delta[b];
			}
		}
		let normal = planeNormal(covariance);
		if (preservePlanes && Math.hypot(...normal) > 0.5) {
			const deltas = ids.map(({ id }) =>
				[0, 1, 2].map(axis => points[id * 3 + axis] - points[i * 3 + axis])
			);
			normal = creaseNormal(deltas, normal, spacing[i]);
		}
		normals.set(normal, i * 3);
	}

	// Prim traversal propagates the sign over the most similar tangent planes first.
	// Each vertex has one heap entry, bounding memory even for large clouds.
	const visited = new Uint8Array(count);
	const costs = new Float32Array(count).fill(Infinity);
	const parent = new Int32Array(count).fill(-1);
	const slots = new Int32Array(count).fill(-1);
	const heap: number[] = [];
	const swap = (a: number, b: number) => {
		[heap[a], heap[b]] = [heap[b], heap[a]];
		slots[heap[a]] = a;
		slots[heap[b]] = b;
	};
	const push = (id: number) => {
		let slot = slots[id];
		if (slot < 0) {
			slot = heap.length;
			heap.push(id);
			slots[id] = slot;
		}
		while (slot > 0) {
			const above = (slot - 1) >> 1;
			if (costs[heap[above]] <= costs[id]) break;
			swap(slot, above);
			slot = above;
		}
	};
	const pop = () => {
		const first = heap[0];
		const last = heap.pop()!;
		slots[first] = -1;
		if (heap.length) {
			heap[0] = last;
			slots[last] = 0;
			let slot = 0;
			while (slot * 2 + 1 < heap.length) {
				let child = slot * 2 + 1;
				if (child + 1 < heap.length && costs[heap[child + 1]] < costs[heap[child]]) child++;
				if (costs[heap[slot]] <= costs[heap[child]]) break;
				swap(slot, child);
				slot = child;
			}
		}
		return first;
	};
	const center = [0, 0, 0];
	for (let i = 0; i < points.length; i++) center[i % 3] += points[i] / count;
	const roots = Array.from({ length: count }, (_, i) => i);
	const radial = Float64Array.from(
		roots,
		i => center.reduce((sum, value, axis) => sum + (points[i * 3 + axis] - value) ** 2, 0)
	);
	roots.sort((a, b) => radial[b] - radial[a]);
	for (const root of roots) {
		if (visited[root] || Math.hypot(...normals.subarray(root * 3, root * 3 + 3)) < 0.5) {
			continue;
		}
		const outward = center.reduce(
			(sum, value, axis) =>
				sum + (points[root * 3 + axis] - value) * normals[root * 3 + axis],
			0
		);
		if (outward < 0) { for (let axis = 0; axis < 3; axis++) normals[root * 3 + axis] *= -1; }
		costs[root] = 0;
		push(root);
		while (heap.length) {
			const i = pop();
			visited[i] = 1;
			const source = parent[i];
			if (
				source >= 0
				&& normals[i * 3] * normals[source * 3]
							+ normals[i * 3 + 1] * normals[source * 3 + 1]
							+ normals[i * 3 + 2] * normals[source * 3 + 2] < 0
			) {
				for (let axis = 0; axis < 3; axis++) normals[i * 3 + axis] *= -1;
			}
			for (let n = 0; n < NEIGHBORS; n++) {
				const j = neighbors[i * NEIGHBORS + n];
				if (j < 0 || visited[j]) continue;
				const dot = Math.abs(
					normals[i * 3] * normals[j * 3] + normals[i * 3 + 1] * normals[j * 3 + 1]
						+ normals[i * 3 + 2] * normals[j * 3 + 2]
				);
				if (dot < 0.15) continue;
				const dx = points[j * 3] - points[i * 3],
					dy = points[j * 3 + 1] - points[i * 3 + 1],
					dz = points[j * 3 + 2] - points[i * 3 + 2];
				const distance = Math.hypot(dx, dy, dz);
				const transverse = Math.abs(
					dx * normals[i * 3] + dy * normals[i * 3 + 1] + dz * normals[i * 3 + 2]
				) / distance;
				if (distance > 4 * Math.max(spacing[i], spacing[j]) || transverse > 0.8) continue;
				const cost = 1 - dot + 0.1 * transverse;
				if (cost >= costs[j]) continue;
				costs[j] = cost;
				parent[j] = i;
				push(j);
			}
		}
	}
	return { normals, spacing, nearest };
};
