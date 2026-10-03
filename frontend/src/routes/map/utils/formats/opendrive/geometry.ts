import { formatOpenDrive } from './definition';
import { node, num, str, type XmlNode } from './xml';

export type XY = [number, number];
export interface Pose {
	x: number;
	y: number;
	heading: number;
}
export interface Curve {
	s: number;
	length: number;
	at: (distance: number) => Pose;
}
export interface Budget {
	sample: () => void;
	vertex: (count: number) => void;
}
export const createBudget = (): Budget => {
	let samples = 0, vertices = 0;
	return {
		sample: () => {
			if (++samples > formatOpenDrive.limits.maxSamples) {
				throw new Error(
					'OpenDRIVEの曲線計算量が上限を超えています。道路を分割してください'
				);
			}
		},
		vertex: count => {
			if ((vertices += count) > formatOpenDrive.limits.maxVertices) {
				throw new Error(
					'OpenDRIVEの表示頂点数が上限を超えています。道路を分割してください'
				);
			}
		}
	};
};

// 8点Gauss-Legendre積分。緩和曲線の各小区間を積分する。
const weights = [0.362683783378362, 0.313706645877887, 0.222381034453374, 0.101228536290376];
const abscissas = [0.18343464249565, 0.525532409916329, 0.796666477413627, 0.960289856497536];
const integrateSpiral = (a: number, b: number, k0: number, rate: number): XY => {
	const mid = (a + b) / 2, half = (b - a) / 2;
	let x = 0, y = 0;
	for (let i = 0; i < 4; i++) {
		for (const sign of [-1, 1]) {
			const s = mid + sign * half * abscissas[i];
			const angle = k0 * s + rate * s * s / 2;
			x += weights[i] * Math.cos(angle);
			y += weights[i] * Math.sin(angle);
		}
	}
	return [x * half, y * half];
};

const polynomialCurve = (
	item: XmlNode,
	length: number,
	parametric: boolean,
	budget: Budget
): Curve['at'] => {
	const coeff = (suffix: string) => ['a', 'b', 'c', 'd'].map(key => num(item, key + suffix));
	const u = parametric ? coeff('U') : [0, 1, 0, 0];
	const v = coeff(parametric ? 'V' : '');
	const range = str(item, 'pRange', 'normalized');
	if (parametric && range !== 'normalized' && range !== 'arcLength') {
		throw new Error('OpenDRIVEのparamPoly3.pRangeが不正です');
	}
	const maxP = parametric && range === 'normalized' ? 1 : length;
	const evalC = (c: number[], p: number) => ((c[3] * p + c[2]) * p + c[1]) * p + c[0];
	const derivative = (c: number[], p: number) => (3 * c[3] * p + 2 * c[2]) * p + c[1];
	const point = (p: number): XY => {
		budget.sample();
		return [evalC(u, p), evalC(v, p)];
	};
	const table: { p: number; s: number; xy: XY; }[] = [{ p: 0, s: 0, xy: point(0) }];
	const subdivide = (a: number, b: number, pa: XY, pb: XY, depth: number) => {
		const m = (a + b) / 2, pm = point(m);
		const q1 = point((3 * a + b) / 4), q3 = point((a + 3 * b) / 4);
		const deviation = Math.max(
			...[q1, pm, q3].map((q, i) =>
				Math.hypot(
					q[0] - pa[0] - (pb[0] - pa[0]) * (i + 1) / 4,
					q[1] - pa[1] - (pb[1] - pa[1]) * (i + 1) / 4
				)
			)
		);
		if (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) > 1 || deviation > 0.0001) {
			if (depth >= 30) throw new Error('OpenDRIVEの3次曲線を近似できません');
			subdivide(a, m, pa, pm, depth + 1);
			subdivide(m, b, pm, pb, depth + 1);
		} else {table.push({
				p: b,
				s: table[table.length - 1].s + Math.hypot(pb[0] - pa[0], pb[1] - pa[1]),
				xy: pb
			});}
	};
	subdivide(0, maxP, table[0].xy, point(maxP), 0);
	const total = table[table.length - 1].s;
	if (!Number.isFinite(total) || total <= 0) {
		throw new Error('OpenDRIVEの3次曲線の長さが不正です');
	}
	if (parametric && Math.abs(total - length) > Math.max(0.1, length * 0.01)) {
		throw new Error('OpenDRIVEのparamPoly3の曲線長とlengthが一致しません');
	}
	return distance => {
		const target = parametric ? distance / length * total : distance;
		let lo = 1, hi = table.length - 1;
		while (lo < hi) {
			const m = (lo + hi) >>> 1;
			if (table[m].s < target) lo = m + 1;
			else hi = m;
		}
		const a = table[lo - 1], b = table[lo];
		const p = a.p + (b.p - a.p) * (target - a.s) / Math.max(1e-15, b.s - a.s);
		return {
			x: evalC(u, p),
			y: evalC(v, p),
			heading: Math.atan2(derivative(v, p), derivative(u, p))
		};
	};
};

export const createCurve = (item: XmlNode, budget: Budget): Curve => {
	const s = num(item, 's'),
		x = num(item, 'x'),
		y = num(item, 'y'),
		hdg = num(item, 'hdg'),
		length = num(item, 'length');
	if (s < 0 || length <= 0) throw new Error('OpenDRIVEの道路形状の長さ・開始位置が不正です');
	const kinds = ['line', 'arc', 'spiral', 'poly3', 'paramPoly3'].filter(key =>
		item[key] !== undefined
	);
	if (kinds.length !== 1) {
		throw new Error('OpenDRIVEのplanViewに未対応または不正な曲線があります');
	}
	const kind = kinds[0], shape = node(item[kind]);
	let local: Curve['at'];
	if (kind === 'line') local = d => ({ x: d, y: 0, heading: 0 });
	else if (kind === 'arc') {
		const k = num(shape, 'curvature');
		local = d => {
			const a = k * d;
			const sinc = Math.abs(a / 2) < 1e-8 ? 1 - a * a / 24 : Math.sin(a / 2) / (a / 2);
			return { x: d * sinc * Math.cos(a / 2), y: d * sinc * Math.sin(a / 2), heading: a };
		};
	} else if (kind === 'spiral') {
		const k0 = num(shape, 'curvStart'), k1 = num(shape, 'curvEnd'), rate = (k1 - k0) / length;
		const steps = Math.max(
			1,
			Math.ceil(length / Math.min(2, 0.1 / Math.max(Math.abs(k0), Math.abs(k1), 1e-12)))
		);
		if (steps > formatOpenDrive.limits.maxSamples) {
			throw new Error('OpenDRIVEの緩和曲線が処理上限を超えています');
		}
		const points: XY[] = [[0, 0]];
		for (let i = 0; i < steps; i++) {
			budget.sample();
			const delta = integrateSpiral(i * length / steps, (i + 1) * length / steps, k0, rate);
			points.push([points[i][0] + delta[0], points[i][1] + delta[1]]);
		}
		local = d => {
			const i = Math.min(steps, Math.floor(d / length * steps));
			const delta = integrateSpiral(i * length / steps, d, k0, rate);
			return {
				x: points[i][0] + delta[0],
				y: points[i][1] + delta[1],
				heading: k0 * d + rate * d * d / 2
			};
		};
	} else local = polynomialCurve(shape, length, kind === 'paramPoly3', budget);
	return {
		s,
		length,
		at: distance => {
			budget.sample();
			const p = local(Math.max(0, Math.min(length, distance)));
			const result = {
				x: x + p.x * Math.cos(hdg) - p.y * Math.sin(hdg),
				y: y + p.x * Math.sin(hdg) + p.y * Math.cos(hdg),
				heading: hdg + p.heading
			};
			if (!Object.values(result).every(Number.isFinite)) {
				throw new Error(
					'OpenDRIVEの曲線座標が不正です'
				);
			}
			return result;
		}
	};
};

/** 道路端と車線境界を同じs位置で細分化。曲線・可変幅を5cm以下の弦誤差で近似する。 */
export const sampleInterval = (
	start: number,
	end: number,
	at: (s: number) => XY[],
	budget: Budget
): { s: number; points: XY[]; }[] => {
	const first = { s: start, points: at(start) };
	const result = [first];
	const split = (a: typeof first, b: typeof first, depth: number) => {
		budget.sample();
		const middle = { s: (a.s + b.s) / 2, points: at((a.s + b.s) / 2) };
		const quarters = [at((3 * a.s + b.s) / 4), middle.points, at((a.s + 3 * b.s) / 4)];
		let error = 0;
		for (let j = 0; j < 3; j++) {
			for (let i = 0; i < a.points.length; i++) {
				const p = quarters[j][i], pa = a.points[i], pb = b.points[i];
				error = Math.max(
					error,
					Math.hypot(
						p[0] - pa[0] - (pb[0] - pa[0]) * (j + 1) / 4,
						p[1] - pa[1] - (pb[1] - pa[1]) * (j + 1) / 4
					)
				);
			}
		}
		if (!Number.isFinite(error)) throw new Error('OpenDRIVEの車線座標が不正です');
		if (b.s - a.s > 2 || error > 0.05) {
			if (depth >= 30) throw new Error('OpenDRIVEの車線形状を近似できません');
			split(a, middle, depth + 1);
			split(middle, b, depth + 1);
		} else {
			budget.vertex(b.points.length);
			result.push(b);
		}
	};
	budget.vertex(first.points.length);
	split(first, { s: end, points: at(end) }, 0);
	return result;
};
