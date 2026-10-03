import { readFileSync } from 'node:fs';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { parseOpenDrive } from '.';
import { convertOpenDrive } from './convert';
import { formatOpenDrive } from './definition';
import { createBudget, createCurve } from './geometry';
import { children, node, parseXml } from './xml';

const fixture = (name: string) =>
	readFileSync(new URL(`./__fixtures__/${name}.xodr`, import.meta.url), 'utf8');
const road = fixture('test-road'),
	local = fixture('test-local'),
	curvesXml = fixture('test-curves');
const ringFor = (text: string, laneId: number, start = 0) => {
	const feature = parseOpenDrive(text).geojson.features.find(f =>
		f.properties.kind === 'lane' && f.properties.lane_id === laneId
		&& f.properties.section_s === start
	)!;
	if (feature.geometry.type !== 'Polygon') throw new Error('test: not polygon');
	return feature.geometry.coordinates[0];
};

describe('OpenDRIVEの道路・車線', () => {
	it('左右の可変幅、laneOffset、singleSideで継続する右車線、header offsetの回転を適用する', () => {
		const result = parseOpenDrive(road);
		expect(result.metadata).toMatchObject({ roadCount: 1, laneCount: 5, name: 'test-road' });
		const line = result.geojson.features[0].geometry;
		if (line.type !== 'LineString') throw new Error('test');
		expect(line.coordinates[0]).toEqual([100, 200]);
		expect(line.coordinates.at(-1)).toEqual([100, 220]);
		const firstLeft = ringFor(road, 1);
		expect(firstLeft).toContainEqual([97, 200]);
		expect(firstLeft).toContainEqual([96, 210]);
		const continuedRight = ringFor(road, -1, 10);
		expect(continuedRight).toContainEqual([102.5, 210]);
		expect(continuedRight).toContainEqual([103, 220]);
		for (const f of result.geojson.features) {
			if (f.geometry.type === 'Polygon') {
				expect(f.geometry.coordinates[0][0]).toEqual(f.geometry.coordinates[0].at(-1));
			}
		}
	});
	it('borderは符号付き絶対t座標として扱い、外側車線を累積幅と混同しない', () => {
		const ring = ringFor(local, -2);
		expect(ring).toContainEqual([0, -3]);
		expect(ring).toContainEqual([0, -5]);
		expect(Math.min(...ring.map(p => p[1]))).toBe(-5);
	});
	it('widthがある場合はborderより優先し、ゼロ幅車線は面にしない', () => {
		const text = local.replace(
			'<border sOffset="0" a="3" b="0" c="0" d="0"/>',
			'<width sOffset="0" a="0" b="0" c="0" d="0"/><border sOffset="0" a="3" b="0" c="0" d="0"/>'
		);
		expect(parseOpenDrive(text).metadata.laneCount).toBe(2);
	});
	it('幅の多項式の切替点と区間をサンプリングに含める', () => {
		const text = local.replace(
			'<border sOffset="0" a="3" b="0" c="0" d="0"/>',
			'<width sOffset="0" a="3" b="0" c="0" d="0"/><width sOffset="3.3" a="3" b="0.5" c="0" d="0"/>'
		);
		const ring = ringFor(text, 1);
		expect(ring).toContainEqual([3.3, 3]);
		expect(ring).toContainEqual([10, 6.35]);
	});
});

describe('OpenDRIVEの線形', () => {
	const elements = children(parseXml(curvesXml).road).map(road =>
		node(node(road.planView).geometry)
	);
	it('lineとarcの端点・接線を解析式に一致させる', () => {
		const line = createCurve(elements[0], createBudget()),
			arc = createCurve(elements[1], createBudget());
		expect(line.at(10)).toEqual({ x: 10, y: 0, heading: 0 });
		expect(arc.at(arc.length).x).toBeCloseTo(10, 9);
		expect(arc.at(arc.length).y).toBeCloseTo(10, 9);
		expect(arc.at(arc.length).heading).toBeCloseTo(Math.PI / 2, 9);
	});
	it('spiralを独立したSimpson積分と比較する', () => {
		const curve = createCurve(elements[2], createBudget());
		let x = 0, y = 0;
		const n = 10000, h = 20 / n;
		for (let i = 0; i <= n; i++) {
			const weight = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
			const s = i * h, heading = 0.0025 * s * s;
			x += weight * Math.cos(heading);
			y += weight * Math.sin(heading);
		}
		expect(curve.at(20).x).toBeCloseTo(x * h / 3, 8);
		expect(curve.at(20).y).toBeCloseTo(y * h / 3, 8);
		expect(curve.at(20).heading).toBeCloseTo(1, 9);
	});
	it('poly3はuではなく弧長sで評価する', () => {
		const curve = createCurve(elements[3], createBudget());
		expect(curve.at(10).x).toBeCloseTo(10 / Math.sqrt(2), 6);
		expect(curve.at(10).y).toBeCloseTo(10 / Math.sqrt(2), 6);
	});
	it.each([4, 5])('paramPoly3 %iのpと弧長sを区別する', i => {
		const curve = createCurve(elements[i], createBudget());
		expect(curve.at(curve.length / 2).x).toBeCloseTo(curve.length / 2, 3);
		expect(curve.at(curve.length).x).toBeCloseTo(curve.length, 6);
	});
	it('paramPoly3の車線幅を実際のs位置で評価する', () => {
		const ring = ringFor(curvesXml, 1);
		for (const [x, y] of ring.filter(p => p[1] > 0)) expect(y).toBeCloseTo(1 + x * 0.1, 3);
	});
});

describe('OpenDRIVEの座標系・入力検査', () => {
	it('PROJのgeoReferenceとoffsetをWGS84へ変換する', async () => {
		const result = await convertOpenDrive(road);
		expect(result.spatialStatus).toBe('resolved');
		const geometry = result.geojson.features[0].geometry;
		if (geometry.type !== 'LineString') throw new Error('test');
		const expected = proj4(parseOpenDrive(road).sourceCrs!, 'EPSG:4326', [100, 220]);
		expect(geometry.coordinates.at(-1)![0]).toBeCloseTo(expected[0], 10);
		expect(geometry.coordinates.at(-1)![1]).toBeCloseTo(expected[1], 10);
	});
	it('小さなローカル座標を経緯度と誤認せず、明示CRSで変換できる', async () => {
		expect((await convertOpenDrive(local)).spatialStatus).toBe('crs-missing');
		expect((await convertOpenDrive(local, 'EPSG:3857')).spatialStatus).toBe('resolved');
	});
	it('未知のgeoReferenceでは元座標を残し、指定CRS失敗では登録を止める', async () => {
		const bad = road.replace(/<!\[CDATA\[[\s\S]*?\]\]>/, 'test-invalid-crs');
		const result = await convertOpenDrive(bad);
		expect(result.spatialStatus).toBe('crs-missing');
		expect(result.geojson).toEqual(parseOpenDrive(bad).geojson);
		expect(result.warnings.join()).toContain('geoReference');
		await expect(convertOpenDrive(local, 'test-invalid-crs')).rejects.toThrow('座標変換');
	});
	it.each([
		['XML破損', '<OpenDRIVE><road></OpenDRIVE>', 'XML'],
		['別形式', '<test/>', 'OpenDRIVE'],
		['道路なし', '<OpenDRIVE><header/></OpenDRIVE>', '道路'],
		['DTD', '<!DOCTYPE OpenDRIVE><OpenDRIVE/>', 'DTD'],
		['不正な数値', local.replace('length="10"', 'length="NaN"'), '数値'],
		['負の幅', road.replace('a="2"', 'a="-2"'), '幅'],
		['境界重複', local.replace('a="-5"', 'a="-2"'), '境界'],
		['車線欠番', local.replace('id="-2"', 'id="-3"'), '車線ID'],
		['未対応曲線', local.replace('<line/>', '<testCurve/>'), 'planView'],
		['道路長の不一致', local.replace('length="10"', 'length="11"'), 'planView']
	])(
		'%sを明示エラーにする',
		(_label, input, error) => expect(() => parseOpenDrive(input)).toThrow(error)
	);
	it('展開頂点数・曲線計算量・入力文字数を制限する', () => {
		for (const key of ['maxVertices', 'maxSamples', 'maxTextLength'] as const) {
			const old = formatOpenDrive.limits[key];
			try {
				Object.assign(formatOpenDrive.limits, { [key]: 1 });
				expect(() => parseOpenDrive(local)).toThrow('上限');
			} finally {
				Object.assign(formatOpenDrive.limits, { [key]: old });
			}
			expect(formatOpenDrive.limits[key]).toBe(old);
		}
	});
});
