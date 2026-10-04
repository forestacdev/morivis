import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { getTemporalFilter } from '$routes/map/utils/layers/vector/filter';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { parseCzml } from '.';
import { czmlBillboardLayout } from './billboard-image';
import { createCzmlEntry } from './entry';

const text = readFileSync(new URL('./__fixtures__/test-billboards.czml', import.meta.url), 'utf8');
const packets = () => JSON.parse(text);
vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));

describe('CZML画像マーカー', () => {
	it('画像を取得せず、時刻ごとの画像・表示状態・位置を評価する', async () => {
		const request = vi.spyOn(globalThis, 'fetch');
		try {
			const result = await parseCzml(text);
			expect(result.timestamps).toHaveLength(5);
			expect(result.billboards.features.map(f => f.properties.billboard_image)).toEqual([
				'test-billboard-red.png',
				'test-billboard-red.png',
				'test-billboard-blue.png',
				'test-billboard-blue.png'
			]);
			expect(result.billboards.features.map(f => f.properties.time)).not.toContain(
				'2024-01-02T00:00:10.000Z'
			);
			expect(result.billboards.features[0].properties).toMatchObject({
				height: expect.closeTo(10),
				billboard_width: 80,
				billboard_height: 40,
				billboard_scale: 1,
				billboard_alpha: 1
			});
			expect(request).not.toHaveBeenCalled();
			expect(result.warnings.join('')).not.toContain('画像');
		} finally {
			request.mockRestore();
		}
	});
	it('色・回転・大きさ・pixelOffsetのサンプル時刻も収集し補間する', async () => {
		const input = packets();
		input[1].billboard.color = {
			epoch: '2024-01-02T00:00:00Z',
			rgba: [0, 255, 0, 0, 255, 8, 0, 0, 255, 128]
		};
		input[1].billboard.scale = { epoch: '2024-01-02T00:00:00Z', number: [0, 1, 8, 2] };
		input[1].billboard.rotation = { epoch: '2024-01-02T00:00:00Z', number: [0, 0, 8, 1] };
		input[1].billboard.pixelOffset = {
			epoch: '2024-01-02T00:00:00Z',
			cartesian2: [0, 0, 0, 8, 16, 24]
		};
		const result = await parseCzml(JSON.stringify(input));
		expect(result.timestamps).toContain('2024-01-02T00:00:08.000Z');
		const middle = result.billboards.features.find(f =>
			f.properties.time === '2024-01-02T00:00:05.000Z'
		)!;
		expect(middle.properties.billboard_scale).toBeCloseTo(1.625);
		expect(middle.properties.billboard_offset_x).toBeCloseTo(10);
		expect(middle.properties.billboard_blue).toBeCloseTo(5 / 8);
	});
	it('show=false・透明・縮尺0は画像マーカーを出力しない', async () => {
		for (
			const change of [{ show: false }, { color: { rgba: [255, 255, 255, 0] } }, { scale: 0 }]
		) {
			const input = packets();
			Object.assign(input[1].billboard, change);
			expect((await parseCzml(JSON.stringify(input))).billboards.features).toHaveLength(0);
		}
	});
	it('負のサイズを登録しない', async () => {
		const input = packets();
		input[1].billboard.width = -1;
		await expect(parseCzml(JSON.stringify(input))).rejects.toThrow('0以上');
	});
	it('未対応の3D表示設定を説明する', async () => {
		const input = packets();
		input[1].billboard.sizeInMeters = true;
		expect((await parseCzml(JSON.stringify(input))).warnings.join('')).toContain('メートル');
	});
	it('非表示の時刻もタイムラインに残して、前の画像が表示され続けない', async () => {
		const result = await parseCzml(text);
		const entry = await createCzmlEntry(result.billboards, 'test-billboard', result.timestamps);
		try {
			expect(entry.properties.temporal!.dimension.values).toEqual(result.timestamps);
			entry.state = {
				temporalFilter: { enabled: true, mode: 'single_start', startIndex: 2, endIndex: 2 }
			};
			expect(getTemporalFilter(entry)).toEqual([
				'==',
				['get', 'time'],
				'2024-01-02T00:00:10.000Z'
			]);
		} finally {
			GeojsonCache.remove(entry.id);
		}
	});
	it('サイズ・原点・回転・オフセットを元画像の縦横比を保って配置する', async () => {
		const properties = (await parseCzml(text)).billboards.features[0].properties;
		const layout = czmlBillboardLayout(properties, 16, 8);
		expect(layout).toMatchObject({
			width: 80,
			height: 40,
			canvasWidth: 80,
			canvasHeight: 40,
			x: 0,
			y: 0
		});
		const shifted = czmlBillboardLayout(
			{
				...properties,
				billboard_rotation: Math.PI / 2,
				billboard_origin_x: 1,
				billboard_origin_y: 1,
				billboard_offset_x: 10,
				billboard_offset_y: 20
			},
			16,
			8
		);
		expect(shifted).toMatchObject({ x: 50, y: 0 });
		expect(shifted.rotation).toBeCloseTo(-Math.PI / 2);
		expect(shifted.canvasWidth).toBeGreaterThanOrEqual(140);
		expect(shifted.canvasHeight).toBeGreaterThanOrEqual(80);
		expect(() => czmlBillboardLayout({ ...properties, billboard_scale: 1000 }, 16, 8)).toThrow(
			'2048'
		);
	});
});
