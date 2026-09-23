import { VectorTile } from '@mapbox/vector-tile';
import mlcontour from 'maplibre-contour';
import Pbf from 'pbf';
import { describe, expect, it } from 'vitest';
import { createContourStyle } from '../layers/contours';
import { CONTOUR_OPTIONS } from './config';

describe('DEMから生成した等高線と表示スタイルの接続', () => {
	it.each([
		{ zoom: 5, interval: 1000, major: 1000 },
		{ zoom: 6, interval: 1000, major: 1000 },
		{ zoom: 7, interval: 500, major: 500 },
		{ zoom: 8, interval: 500, major: 500 },
		{ zoom: 9, interval: 100, major: 100 },
		{ zoom: 11, interval: 50, major: 50 },
		{ zoom: 14, interval: 10, major: 50 }
	])('ズーム$zoomで標高・主曲線属性を生成する', async ({ zoom, interval, major }) => {
		const dem = new mlcontour.DemSource({
			url: 'https://test-dem.invalid/{z}/{x}/{y}',
			maxzoom: 16,
			worker: false
		});
		// 実在の地形を使わず、負の標高を含む単純な斜面を生成する。
		const elevationStep = Math.max(40, interval * 2);
		dem.manager = new mlcontour.LocalDemManager({
			demUrlPattern: 'https://test-dem.invalid/{z}/{x}/{y}',
			maxzoom: 16,
			encoding: 'terrarium',
			cacheSize: 10,
			timeoutMs: 1000,
			getTile: async () => ({ data: new Blob() }),
			decodeImage: async () => ({
				width: 16,
				height: 16,
				data: Float32Array.from(
					{ length: 256 },
					(_, index) => ((index % 16) - 5) * elevationStep
				)
			})
		});
		const tileUrl = dem.contourProtocolUrl(CONTOUR_OPTIONS);
		const { data } = await dem.contourProtocolV4({
			url: tileUrl.replace('{z}', String(zoom)).replace('{x}', '1').replace('{y}', '1')
		}, new AbortController());
		const tile = new VectorTile(new Pbf(new Uint8Array(data)));
		const { layers } = createContourStyle(tileUrl, ['test-font']);
		const line = layers.find(layer => layer.type === 'line')!;
		expect(line.minzoom).toBeLessThanOrEqual(zoom);
		if (!('source-layer' in line)) throw new Error('Missing vector layer');
		const contours = tile.layers[line['source-layer']!];
		expect(contours.length).toBeGreaterThan(0);
		const levels = new Set<number>();
		for (let index = 0; index < contours.length; index += 1) {
			const feature = contours.feature(index);
			const elevation = Number(feature.properties.ele);
			const level = Number(feature.properties.level);
			expect(Math.abs(elevation % interval)).toBe(0);
			expect(level).toBe(elevation % major === 0 ? 1 : 0);
			levels.add(level);
		}
		expect(levels.has(1)).toBe(true);
		if (interval !== major) expect(levels.has(0)).toBe(true);
	});
});
