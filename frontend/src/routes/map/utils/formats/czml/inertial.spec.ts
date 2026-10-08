import {
	Cartesian3,
	Cartographic,
	JulianDate,
	Math as CesiumMath,
	Matrix3,
	Resource,
	Transforms
} from '@cesium/engine';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCzml } from '.';
import { prepareCzml } from './prepare';

const contents = readFileSync(
	new URL('./__fixtures__/test-inertial.czml', import.meta.url),
	'utf8'
);
const packets = () => JSON.parse(contents);
const engine = dirname(createRequire(import.meta.url).resolve('@cesium/engine/package.json'));

beforeEach(() => {
	// 入力は架空fixture。変換の基準表はアプリと同じCesium依存パッケージから読む。
	const fetchJson = vi.spyOn(Resource.prototype, 'fetchJson');
	fetchJson.mockImplementation(async () => {
		const resource = fetchJson.mock.contexts.at(-1) as Resource;
		const name = /IAU2006_XYS_\d+\.json$/.exec(resource.url)?.[0];
		if (!name) throw new Error('Unexpected resource');
		return JSON.parse(readFileSync(join(engine, 'Source/Assets/IAU2006_XYS', name), 'utf8'));
	});
});
afterEach(() => vi.restoreAllMocks());

describe('CZML INERTIAL', () => {
	it('無期限の表示区間は評価時刻にせず、有限の境界と表示切替を保つ', async () => {
		const text = readFileSync(
			new URL('./__fixtures__/test-inertial-open-interval.czml', import.meta.url),
			'utf8'
		);
		const result = await parseCzml(text);
		expect(result.timestamps).toEqual([
			'2024-01-02T00:00:00.000Z',
			'2024-01-02T00:15:00.000Z',
			'2024-01-02T00:30:00.000Z',
			'2024-01-02T00:45:00.000Z',
			'2024-01-02T01:00:00.000Z'
		]);
		expect(result.points.features.map(feature => feature.properties.time)).toEqual([
			'2024-01-02T00:15:00.000Z',
			'2024-01-02T00:30:00.000Z'
		]);
		const input = JSON.parse(text);
		delete input[0].clock;
		delete input[1].point;
		expect(() => prepareCzml(JSON.stringify(input))).toThrow('時刻が必要');
	});
	it('通常の有限な期間外境界は無期限と扱わない', async () => {
		const input = packets();
		input[1].point = {
			show: [{ interval: '1900-01-01T00:00:00Z/2024-01-02T00:00:00Z', boolean: false }]
		};
		await expect(parseCzml(JSON.stringify(input))).rejects.toThrow('対応期間外');
	});
	it('画像マーカーにも同じINERTIAL変換を適用する', async () => {
		const input = packets();
		input[1].billboard = { image: 'test-billboard-red.png' };
		const result = await parseCzml(JSON.stringify(input));
		const points = result.points.features.filter(f =>
			f.properties.entity_id === 'test-inertial-constant'
		);
		expect(result.billboards.features.map(f => f.geometry)).toEqual(
			points.map(f => f.geometry)
		);
		expect(result.billboards.features.map(f => f.properties.time)).toEqual(result.timestamps);
	});
	it('慣性系で一定の位置も時刻ごとに地球固定座標へ変換し、軌跡を作る', async () => {
		const result = await parseCzml(contents);
		const points = result.points.features.filter(f =>
			f.properties.entity_id === 'test-inertial-constant'
		);
		expect(points).toHaveLength(3);
		const longitudes = points.map((point, i) => {
			const rotation = Transforms.computeIcrfToFixedMatrix(
				JulianDate.fromIso8601(result.timestamps[i])
			)!;
			const fixed = Matrix3.multiplyByVector(
				rotation,
				new Cartesian3(7000000, 0, 0),
				new Cartesian3()
			);
			const expected = Cartographic.fromCartesian(fixed);
			if (point.geometry.type !== 'Point') throw new Error('Expected point');
			expect(point.geometry.coordinates[0]).toBeCloseTo(
				CesiumMath.toDegrees(expected.longitude),
				8
			);
			expect(point.geometry.coordinates[1]).toBeCloseTo(
				CesiumMath.toDegrees(expected.latitude),
				8
			);
			expect(point.properties.height).toBeCloseTo(expected.height, 4);
			return point.geometry.coordinates[0];
		});
		expect(longitudes[0] - longitudes[2]).toBeGreaterThan(14.9);
		expect(longitudes[0] - longitudes[2]).toBeLessThan(15.1);
		expect(result.tracks.features).toHaveLength(3);
	});
	it('慣性系で補間してから変換し、位置参照とラインに同じ座標を使う', async () => {
		const result = await parseCzml(contents);
		const sampled = result.points.features.filter(f =>
			f.properties.entity_id === 'test-inertial-sampled'
		);
		const referenced = result.points.features.filter(f =>
			f.properties.entity_id === 'test-inertial-reference'
		);
		expect(referenced.map(f => f.geometry)).toEqual(sampled.map(f => f.geometry));
		const time = JulianDate.fromIso8601(result.timestamps[1]);
		const fixed = Matrix3.multiplyByVector(
			Transforms.computeIcrfToFixedMatrix(time)!,
			new Cartesian3(7000000, 150000, 5000),
			new Cartesian3()
		);
		const expected = Cartographic.fromCartesian(fixed);
		if (sampled[1].geometry.type !== 'Point') throw new Error('Expected point');
		expect(sampled[1].geometry.coordinates[0]).toBeCloseTo(
			CesiumMath.toDegrees(expected.longitude),
			8
		);
		expect(sampled[1].geometry.coordinates[1]).toBeCloseTo(
			CesiumMath.toDegrees(expected.latitude),
			8
		);
		for (const [i, line] of result.lines.features.entries()) {
			if (line.geometry.type !== 'LineString' || sampled[i].geometry.type !== 'Point') {
				throw new Error('Expected line/point');
			}
			expect(line.geometry.coordinates[1]).toEqual(sampled[i].geometry.coordinates);
		}
	});
	it('3Dモデルの位置・高さ・速度由来の向きを各時刻に反映する', async () => {
		const result = await parseCzml(contents);
		expect(result.models).toHaveLength(1);
		const frames = result.models[0].frames;
		expect(frames).toHaveLength(3);
		const points = result.points.features.filter(f =>
			f.properties.entity_id === 'test-inertial-constant'
		);
		for (const [i, frame] of frames.entries()) {
			const point = points[i];
			if (point.geometry.type !== 'Point') throw new Error('Expected point');
			expect(frame.position).toEqual([
				...point.geometry.coordinates,
				point.properties.height
			]);
			expect(frame.rotation.every(Number.isFinite)).toBe(true);
			expect(Math.abs(Matrix3.determinant(Matrix3.fromArray(frame.rotation)))).toBeCloseTo(1);
		}
	});
	it('cartesianVelocityを読み込める', async () => {
		const input = packets();
		input[2].position.cartesianVelocity = [
			0,
			7000000,
			100000,
			0,
			0,
			100000 / 3600,
			10000 / 3600,
			3600,
			7000000,
			200000,
			10000,
			0,
			100000 / 3600,
			10000 / 3600
		];
		delete input[2].position.cartesian;
		expect((await parseCzml(JSON.stringify(input))).points.features).toHaveLength(9);
	});
	it('時刻がなければ任意の日付で配置しない', async () => {
		const input = packets().slice(0, 2);
		delete input[0].clock;
		await expect(parseCzml(JSON.stringify(input))).rejects.toThrow('時刻が必要');
	});
	it.each(['1900-01-01T00:00:00Z', '2100-01-01T00:00:00Z'])(
		'変換表の期間外（%s）は拒否する',
		async time => {
			const input = packets().slice(0, 2);
			input[0].clock = { currentTime: time };
			await expect(parseCzml(JSON.stringify(input))).rejects.toThrow('対応期間外');
		}
	);
	it('変換表の読込失敗を近似変換で隠さない', async () => {
		vi.spyOn(Transforms, 'preloadIcrfFixed').mockResolvedValue(undefined);
		vi.spyOn(Transforms, 'computeIcrfToFixedMatrix').mockReturnValue(undefined);
		const fallback = vi.spyOn(Transforms, 'computeTemeToPseudoFixedMatrix');
		await expect(parseCzml(contents)).rejects.toThrow('変換データを読み込めません');
		expect(fallback).not.toHaveBeenCalled();
	});
	it('未知の座標系や線の未定義なreferenceFrameを黙ってFIXEDと解釈しない', async () => {
		const input = packets();
		input[1].position.referenceFrame = 'TEST_INVALID';
		await expect(parseCzml(JSON.stringify(input))).rejects.toThrow('referenceFrame');
		const lines = packets();
		lines[4].polyline.positions.referenceFrame = 'INERTIAL';
		await expect(parseCzml(JSON.stringify(lines))).rejects.toThrow('references');
	});
	it('FIXEDのみなら変換表を読まない', async () => {
		const input = packets().slice(0, 2);
		input[1].position.referenceFrame = 'FIXED';
		delete input[1].orientation;
		const preload = vi.spyOn(Transforms, 'preloadIcrfFixed');
		await parseCzml(JSON.stringify(input));
		expect(preload).not.toHaveBeenCalled();
	});
});
