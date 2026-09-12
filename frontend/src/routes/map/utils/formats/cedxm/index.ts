import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import { DOMParser } from '@xmldom/xmldom';
import { XMLValidator } from 'fast-xml-parser';
import type { JwwParseResult } from '../jww';

type V3 = [number, number, number];
type V2 = [number, number];
type Faces = V3[][];
export interface CedxmResult extends JwwParseResult {
	model: FeatureCollection;
}

const COLORS: Record<string, string> = {
	柱材: '#c58a49',
	横架材: '#dfb478',
	補助部材: '#b68454',
	壁: '#d4d0c8',
	部屋: '#d5b49a',
	屋根: '#657583',
	開口: '#70b7d3',
	外壁線: '#777777',
	階段: '#aa8569'
};
const children = (el: Element) =>
	Array.from(el.childNodes).filter(n => n.nodeType === 1) as Element[];
const child = (el: Element, tag: string) => children(el).find(n => n.tagName === tag);
const content = (el: Element, tag: string) => child(el, tag)?.textContent?.trim() ?? '';
const number = (text: string | null | undefined, field: string) => {
	if (text == null || !text.trim() || !Number.isFinite(Number(text))) {
		throw new Error(`CEDXMの${field}が不正です`);
	}
	return Number(text);
};
const metres = (el: Element, tag: string) => number(content(el, tag), tag) / 1000;
const tuples = (el: Element | undefined, attr: string, dimensions: number): number[][] => {
	if (!el) throw new Error('CEDXMの座標要素がありません');
	const raw = el.getAttribute(attr)?.trim();
	if (!raw) throw new Error(`CEDXMの${attr}がありません`);
	const result = raw.split(/\s+/).map(tuple => {
		const values = tuple.split(',');
		if (values.length !== dimensions) throw new Error('CEDXMの座標の次元が不正です');
		return values.map(value => number(value, attr) / 1000);
	});
	if (el.hasAttribute('点数') && number(el.getAttribute('点数'), '点数') !== result.length) {
		throw new Error('CEDXMの点数と座標が一致しません');
	}
	return result;
};
const coordinate = (el: Element | undefined, dimensions: number) => {
	const points = tuples(el, '点', dimensions);
	if (points.length !== 1) throw new Error('CEDXMの配置点が不正です');
	return points[0];
};
const ring = <T extends number[]>(points: T[]) => {
	if (points.length < 3) throw new Error('CEDXMの面に必要な点がありません');
	return points[0].every((value, i) => value === points.at(-1)![i])
		? points
		: [...points, [...points[0]] as T];
};
const extrude = (bottom: V3[], top: V3[]): Faces => {
	const b = ring(bottom).slice(0, -1), t = ring(top).slice(0, -1);
	return [
		ring([...b].reverse()),
		ring(t),
		...b.map((p, i) => ring([p, b[(i + 1) % b.length], t[(i + 1) % t.length], t[i]]))
	];
};
const cross = (
	a: V3,
	b: V3
): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (v: V3): V3 => {
	const length = Math.hypot(...v);
	if (length < 1e-9) throw new Error('CEDXMの部材長さが0です');
	return v.map(n => n / length) as V3;
};
const beam = (a: V3, b: V3, width: number, height: number): Faces => {
	const axis = normalize(b.map((n, i) => n - a[i]) as V3);
	const side = normalize(cross(axis, Math.abs(axis[2]) > 0.999 ? [0, 1, 0] : [0, 0, 1]));
	const up = normalize(cross(side, axis));
	const corners = (p: V3): V3[] =>
		[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) =>
			p.map((n, i) => n + side[i] * x * width / 2 + up[i] * y * height / 2) as V3
		);
	return extrude(corners(a), corners(b));
};

export const decodeCedxm = (buffer: ArrayBuffer): string => {
	const bytes = new Uint8Array(buffer);
	const header = new TextDecoder().decode(bytes.subarray(0, 200));
	const encoding = /encoding\s*=\s*["']([^"']+)/i.exec(header)?.[1] ?? 'utf-8';
	if (!/^(?:utf-8|shift[-_]jis|sjis|cp932|windows-31j)$/i.test(encoding)) {
		throw new Error(`未対応のCEDXM文字コードです: ${encoding}`);
	}
	return new TextDecoder(/utf-8/i.test(encoding) ? 'utf-8' : 'shift-jis', { fatal: true }).decode(
		buffer
	);
};

/** CEDXM CADIF XML → local metres, 2D geometry + one closed surface set per member. */
export const parseCedxm = (text: string): CedxmResult => {
	if (text.length > 64 * 1024 * 1024) throw new Error('CEDXMが64 MiBを超えています');
	if (/<!DOCTYPE|<!ENTITY/i.test(text)) {
		throw new Error('DOCTYPE・ENTITYを含むCEDXMには対応していません');
	}
	const valid = XMLValidator.validate(text);
	if (valid !== true) throw new Error(`CEDXMのXMLが不正です: ${valid.err.msg}`);
	const root = new DOMParser().parseFromString(text, 'text/xml')
		.documentElement as unknown as Element;
	if (!root || root.tagName !== 'CADIF') throw new Error('CEDXMのCADIF XMLではありません');
	const plan: FeatureCollection = { type: 'FeatureCollection', features: [] };
	const model: FeatureCollection = { type: 'FeatureCollection', features: [] };
	const warnings = new Set<string>();
	const layers = new Map<string, JwwParseResult['layers'][number]>();
	let members = 0;
	const add = (
		el: Element,
		kind: string,
		key: string,
		geometry: Feature['geometry'],
		faces?: Faces
	) => {
		const floor = content(el, '層');
		const layer = `${floor || '未指定'}階 / ${kind}`;
		const properties: FeatureProp = {
			type: kind,
			layer,
			floor,
			source_id: content(el, 'ID'),
			name: content(el, '名称') || kind,
			color: COLORS[kind],
			member_id: key
		};
		for (const n of children(el)) {
			if (children(n).length === 0 && n.textContent?.trim()) {
				properties[n.tagName] = n.textContent.trim();
			}
		}
		const dimension = child(el, '寸法');
		if (dimension) {
			for (const n of children(dimension)) {
				properties[n.tagName] = n.textContent?.trim() ?? '';
			}
		}
		plan.features.push({ type: 'Feature', id: key, geometry, properties });
		if (faces) {
			model.features.push({
				type: 'Feature',
				id: key,
				geometry: {
					type: 'MultiPolygon',
					coordinates: faces.map(face => [face])
					// The mesh converter accepts XYZ; the map's shared geometry type is XY-only.
				} as unknown as Feature['geometry'],
				properties
			});
		}
		const info = layers.get(layer)
			?? { key: layer, name: layer, group: 0, scale: 1, visible: true, count: 0 };
		info.count++;
		layers.set(layer, info);
	};
	const sectionNames = new Set([
		'部屋情報',
		'壁情報',
		'構造材情報',
		'補助部材情報',
		'外壁線情報',
		'開口情報',
		'階段情報',
		'屋根情報'
	]);
	for (const section of children(root)) {
		if (!sectionNames.has(section.tagName)) continue;
		for (const el of children(section)) {
			if (++members > 100_000) throw new Error('CEDXMの部材数が上限を超えています');
			const kind = el.tagName;
			const key = `cedxm-${members}`;
			const dimensions = () => {
				const d = child(el, '寸法');
				if (!d) throw new Error('CEDXMの部材寸法がありません');
				const w = metres(d, '寸法1'), h = metres(d, '寸法2');
				if (w <= 0 || h <= 0) throw new Error('CEDXMの部材寸法は正数で指定してください');
				return [w, h];
			};
			if (kind === '柱材') {
				const [x, y] = coordinate(child(el, '配置点'), 2);
				const upper = child(el, '上端'), lower = child(el, '下端');
				if (!upper || !lower) throw new Error('CEDXMの柱の上下端がありません');
				const top = metres(upper, 'Z'), bottom = metres(lower, 'Z');
				if (top <= bottom) throw new Error('CEDXMの柱の高さが不正です');
				const [w, h] = dimensions();
				const outline: V2[] = [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [
					x + w / 2,
					y + h / 2
				], [x - w / 2, y + h / 2]];
				add(
					el,
					kind,
					key,
					{ type: 'Polygon', coordinates: [ring(outline)] },
					extrude(
						outline.map(([x, y]) => [x, y, bottom]),
						outline.map(([x, y]) => [x, y, top])
					)
				);
			} else if (kind === '横架材' || kind === '補助部材') {
				const a = coordinate(child(el, kind === '横架材' ? '始端3D' : '始点3D'), 3) as V3;
				const b = coordinate(child(el, kind === '横架材' ? '終端3D' : '終点3D'), 3) as V3;
				const [w, h] = dimensions();
				add(el, kind, key, {
					type: 'LineString',
					coordinates: [[a[0], a[1]], [b[0], b[1]]]
				}, beam(a, b, w, h));
				warnings.add(
					'横架材・補助部材は端点を芯とする矩形断面の簡易モデルです。継手・仕口・断面の回転は再現しません。'
				);
			} else if (kind === '壁') {
				const points = tuples(child(el, '線分2D'), '始点終点', 2) as V2[];
				if (points.length !== 2) throw new Error('CEDXMの壁の端点数が不正です');
				const [a, b] = points,
					dx = b[0] - a[0],
					dy = b[1] - a[1],
					length = Math.hypot(dx, dy);
				const width = metres(el, '壁厚'),
					bottom = metres(el, '下端高'),
					top = metres(el, '上端高');
				if (length <= 0 || width <= 0 || top <= bottom) {
					throw new Error('CEDXMの壁寸法が不正です');
				}
				const ox = -dy / length * width / 2, oy = dx / length * width / 2;
				const outline: V2[] = [[a[0] + ox, a[1] + oy], [b[0] + ox, b[1] + oy], [
					b[0] - ox,
					b[1] - oy
				], [a[0] - ox, a[1] - oy]];
				add(
					el,
					kind,
					key,
					{ type: 'LineString', coordinates: points },
					extrude(
						outline.map(([x, y]) => [x, y, bottom]),
						outline.map(([x, y]) => [x, y, top])
					)
				);
				warnings.add('壁の開口は別の面として表示し、壁のくり抜きは行いません。');
			} else if (kind === '開口') {
				const points = tuples(child(el, '領域3D'), '点列', 3) as V3[];
				const line = tuples(child(el, '線分2D'), '始点終点', 2) as V2[];
				add(el, kind, key, { type: 'LineString', coordinates: line }, [ring(points)]);
			} else if (kind === '部屋' || kind === '外壁線' || kind === '屋根') {
				const outline = tuples(child(el, '領域2D'), '点列', 2) as V2[];
				let faces: Faces | undefined;
				if (kind === '部屋') {
					faces = [ring(outline.map(([x, y]) => [x, y, metres(el, '床高')] as V3))];
				}
				if (kind === '屋根') {
					const ref = child(el, '基準線');
					if (!ref) throw new Error('CEDXMの屋根の基準線がありません');
					const [a, b] = tuples(child(ref, '線分2D'), '始点終点', 2);
					if (!a || !b) throw new Error('CEDXMの屋根基準線の端点が不正です');
					const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
					if (!length) throw new Error('CEDXMの屋根基準線の長さが0です');
					const z = metres(ref, '高さ'),
						slope = number(content(el, '屋根勾配'), '屋根勾配') / 10;
					faces = [
						ring(
							outline.map(([x, y]) =>
								[
									x,
									y,
									z + ((x - a[0]) * -dy + (y - a[1]) * dx) / length * slope
								] as V3
							)
						)
					];
					warnings.add(
						'屋根は基準線の左側へ上る勾配から作る簡易面です。仕上げ厚み・軒先加工は再現しません。'
					);
				}
				add(
					el,
					kind,
					key,
					kind === '外壁線'
						? { type: 'LineString', coordinates: ring(outline) }
						: { type: 'Polygon', coordinates: [ring(outline)] },
					faces
				);
			} else if (kind === '階段') {
				let n = 0;
				for (const block of children(el).filter(n => n.tagName === '階段ブロック')) {
					add(el, kind, `${key}-${n++}`, {
						type: 'Polygon',
						coordinates: [ring(tuples(child(block, '領域2D'), '点列', 2) as V2[])]
					});
				}
				warnings.add('階段は2Dの輪郭を読み込みます。各段の3D形状は対象外です。');
			} else warnings.add(`未対応の要素「${kind}」を除外しました。`);
		}
	}
	if (!plan.features.length) throw new Error('読み込めるCEDXM図形がありません');
	return {
		geojson: plan,
		model,
		version: null,
		layers: [...layers.values()],
		warnings: [...warnings]
	};
};
