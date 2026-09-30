import { afterEach, describe, expect, it, vi } from 'vitest';
import { arcGisLegendToImageLegend } from './legend';
import { fetchArcGisMapServerInfo } from './map-server';

const serviceUrl = 'https://example.test/arcgis/rest/services/test-map/MapServer';
const metadata = {
	mapName: 'test-map',
	singleFusedMapCache: true,
	tileInfo: { rows: 256, lods: [{ level: 2 }, { level: 5 }] },
	fullExtent: { xmin: 0, ymin: 0, xmax: 1, ymax: 1, spatialReference: { wkid: 4326 } },
	layers: [
		{ id: 0, name: 'test-visible', parentLayerId: -1, defaultVisibility: true },
		{
			id: 1,
			name: 'test-group',
			parentLayerId: -1,
			subLayerIds: [2, 3],
			defaultVisibility: false
		},
		{ id: 2, name: 'test-child', parentLayerId: 1, defaultVisibility: true },
		{ id: 3, name: 'test-hidden-child', parentLayerId: 1, defaultVisibility: false },
		{ id: 4, name: 'test-hidden', parentLayerId: -1, defaultVisibility: false }
	]
};
const legendData = {
	layers: [0, 2, 3, 4].map((id) => ({
		layerId: id,
		layerName: `test-layer-${id}`,
		legend: [{ label: `test-label-${id}`, url: `test-symbol-${id}.png` }]
	}))
};

const mockService = (info: unknown = metadata, legend: unknown = legendData, status = 200) => {
	const fetchMock = vi.fn()
		.mockResolvedValueOnce(new Response(JSON.stringify(info)))
		.mockResolvedValueOnce(new Response(JSON.stringify(legend), { status }));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
};

afterEach(() => vi.unstubAllGlobals());

describe('ArcGIS MapServerの凡例付き登録情報', () => {
	it('既存のタイル設定を保ち、非表示の親グループ配下の凡例を除く', async () => {
		const fetchMock = mockService();
		const info = await fetchArcGisMapServerInfo(`${serviceUrl}/?f=pjson`);
		expect(info).toMatchObject({
			name: 'test-map',
			tileUrl: `${serviceUrl}/tile/{z}/{y}/{x}`,
			minZoom: 2,
			maxZoom: 5,
			tileSize: 256,
			bounds: [0, 0, 1, 1],
			legendStatus: 'available'
		});
		expect(info.legend?.categories).toEqual([{
			name: 'test-layer-0',
			labels: ['test-label-0'],
			urls: [`${serviceUrl}/0/images/test-symbol-0.png`]
		}]);
		expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
			`${serviceUrl}?f=json`,
			`${serviceUrl}/legend?f=json`
		]);
	});

	it('個別レイヤー指定時は、そのレイヤーの地図と凡例だけを取得する', async () => {
		mockService();
		const info = await fetchArcGisMapServerInfo(`${serviceUrl}/2/?token=test-token&f=pjson`);
		const url = new URL(info.tileUrl);
		expect(url.pathname).toBe(new URL(serviceUrl).pathname + '/export');
		expect(url.searchParams.get('layers')).toBe('show:2');
		expect(url.searchParams.get('bbox')).toBe('{bbox-epsg-3857}');
		expect(url.searchParams.get('token')).toBe('test-token');
		expect(info.tileUrl).toContain('bbox={bbox-epsg-3857}');
		expect(info.name).toBe('test-child');
		expect(info.legend?.categories.map((category) => category.name)).toEqual(['test-layer-2']);
	});

	it('グループ指定時もexportと凡例の対象を一致させる', async () => {
		mockService();
		const info = await fetchArcGisMapServerInfo(`${serviceUrl}/1`);
		expect(new URL(info.tileUrl).searchParams.get('layers')).toBe('show:2,3');
		expect(info.legend?.categories.map((category) => category.name)).toEqual([
			'test-layer-2',
			'test-layer-3'
		]);
	});

	it('非キャッシュサービスはexportで描画し、既定で表示するレイヤーの凡例を取り込む', async () => {
		mockService({ ...metadata, singleFusedMapCache: false, tileInfo: undefined });
		const info = await fetchArcGisMapServerInfo(serviceUrl);
		const url = new URL(info.tileUrl);
		expect(url.searchParams.get('f')).toBe('image');
		expect(url.searchParams.get('imageSR')).toBe('3857');
		expect(url.searchParams.get('size')).toBe('256,256');
		expect(url.searchParams.has('layers')).toBe(false);
		expect(info.legend?.categories).toHaveLength(1);
	});

	it('存在しないレイヤーをサービス全体として登録しない', async () => {
		const fetchMock = mockService();
		await expect(fetchArcGisMapServerInfo(`${serviceUrl}/99`)).rejects.toThrow(
			'見つかりません'
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each([
		{ legend: {}, status: 503 },
		{ legend: { error: { message: 'test-error' } }, status: 200 },
		{ legend: { layers: null }, status: 200 }
	])('凡例APIの失敗でも地図の登録情報を返す (%j)', async ({ legend, status }) => {
		mockService(metadata, legend, status);
		const info = await fetchArcGisMapServerInfo(serviceUrl);
		expect(info.legendStatus).toBe('unavailable');
		expect(info.legend).toBeUndefined();
		expect(info.tileUrl).toBe(`${serviceUrl}/tile/{z}/{y}/{x}`);
	});

	it('通信エラーやタイムアウトでも地図を登録できる', async () => {
		const fetchMock = mockService();
		fetchMock.mockReset()
			.mockResolvedValueOnce(new Response(JSON.stringify(metadata)))
			.mockRejectedValueOnce(new DOMException('test-timeout', 'TimeoutError'));
		expect((await fetchArcGisMapServerInfo(serviceUrl)).legendStatus).toBe('unavailable');
	});

	it('凡例が空の場合と取得に失敗した場合を区別する', async () => {
		mockService(metadata, { layers: [] });
		const info = await fetchArcGisMapServerInfo(serviceUrl);
		expect(info.legendStatus).toBe('empty');
		expect(info.legend).toBeUndefined();
	});

	it('サービス情報そのものの取得エラーは通知する', async () => {
		mockService({ error: { message: 'test-service-error' } });
		await expect(fetchArcGisMapServerInfo(serviceUrl)).rejects.toThrow('test-service-error');
	});
});

describe('ArcGIS凡例の正規化', () => {
	it('埋め込み画像を優先し、不正な記号を除いてもラベルとの対応を保つ', () => {
		const legend = arcGisLegendToImageLegend({
			layers: [{
				layerId: 0,
				layerName: 'test-layer',
				legend: [
					{
						label: 'test-embedded',
						imageData: 'AA==',
						contentType: 'image/png',
						url: 'unused.png'
					},
					{ label: 'test-invalid', url: 'javascript:test' },
					null,
					{ label: '', url: 'test-symbol.png' }
				]
			}]
		}, serviceUrl);
		expect(legend).toEqual({
			type: 'image',
			layout: 'symbols',
			categories: [{
				name: 'test-layer',
				labels: ['test-embedded', 'test-layer'],
				urls: ['data:image/png;base64,AA==', `${serviceUrl}/0/images/test-symbol.png`]
			}]
		});
	});

	it('相対画像URLには認証を引き継ぎ、別オリジンの画像URLには転送しない', () => {
		const legend = arcGisLegendToImageLegend({
			layers: [{
				layerId: 0,
				legend: [
					{ url: 'test-symbol.png' },
					{ url: 'https://images.example.test/test-symbol.png' }
				]
			}]
		}, `${serviceUrl}?token=test-token&f=json`);
		expect(legend?.categories[0].urls).toEqual([
			`${serviceUrl}/0/images/test-symbol.png?token=test-token`,
			'https://images.example.test/test-symbol.png'
		]);
	});
});
