import type { StyleSpecification } from '$routes/map/utils/maplibre';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock('$routes/constants', () => ({
	MAP_STYLE_SATELLITE_PATH: 'https://example.com/test-style.json'
}));
vi.mock('$routes/map/utils/platform/request', () => ({ fetchWithDevProxy: fetchMock }));

const createStyle = (): StyleSpecification => ({
	version: 8,
	sources: {
		'test-vector': { type: 'vector', url: 'pmtiles://https://example.com/test-vector.pmtiles' },
		'test-label-vector': { type: 'vector', url: 'https://example.com/test-labels.json' },
		'test-poi-vector': { type: 'vector', url: 'https://example.com/test-pois.json' },
		'test-unused': {
			type: 'vector',
			tiles: ['https://example.com/test-unused/{z}/{x}/{y}.pbf']
		}
	},
	layers: [
		{ id: 'test-background', type: 'background' },
		{
			id: 'test-road',
			type: 'line',
			source: 'test-vector',
			'source-layer': 'transportation',
			minzoom: 3,
			filter: ['==', ['get', 'class'], 'primary'],
			paint: {
				'line-color': '#112233',
				'line-width': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 3]
			}
		},
		{
			id: 'label-test-road',
			type: 'symbol',
			source: 'test-vector',
			'source-layer': 'transportation'
		},
		{
			id: 'test-rail',
			type: 'line',
			source: 'test-vector',
			'source-layer': 'transportation',
			filter: ['==', ['get', 'class'], 'rail']
		},
		{
			id: 'test-waterway',
			type: 'line',
			source: 'test-unused',
			'source-layer': 'waterway'
		},
		{
			id: 'test-boundary',
			type: 'line',
			source: 'test-vector',
			'source-layer': 'boundary'
		},
		{
			id: 'poi-test-place',
			type: 'symbol',
			source: 'test-poi-vector',
			'source-layer': 'place',
			layout: { 'icon-image': 'test-icon' }
		},
		{
			id: 'label-test-poi',
			type: 'symbol',
			source: 'test-label-vector',
			'source-layer': 'poi',
			layout: { 'text-field': ['get', 'test-name'] }
		},
		{ id: 'test-unknown', type: 'symbol', source: 'test-unused', 'source-layer': 'poi' }
	]
});

beforeEach(() => {
	vi.resetModules();
	fetchMock.mockReset();
});

describe('extractReferenceStyle', () => {
	it('線・地名・POIを元の順番とスタイル設定で取り出し、ソースを分離する', async () => {
		const { extractReferenceStyle } = await import('./reference-style');
		const style = createStyle();
		const original = structuredClone(style);
		const result = extractReferenceStyle(style);

		expect(result.layers).toEqual([1, 2, 3, 5, 6, 7].map((index) => ({
			...style.layers[index],
			id: `@reference_${style.layers[index].id}`,
			source: `@reference_${
				'source' in style.layers[index] ? style.layers[index].source : ''
			}`
		})));
		expect(result.sources).toEqual({
			'@reference_test-vector': style.sources['test-vector'],
			'@reference_test-poi-vector': style.sources['test-poi-vector'],
			'@reference_test-label-vector': style.sources['test-label-vector']
		});
		expect(style).toEqual(original);
	});

	it('参照先ソースが欠けている場合はエラーにする', async () => {
		const { extractReferenceStyle } = await import('./reference-style');
		const style = createStyle();
		delete style.sources['test-vector'];
		expect(() => extractReferenceStyle(style)).toThrow('ベクターソースが見つかりません');
	});

	it('対象レイヤーがない場合はエラーにする', async () => {
		const { extractReferenceStyle } = await import('./reference-style');
		expect(() => extractReferenceStyle({ version: 8, sources: {}, layers: [] }))
			.toThrow('レイヤーがありません');
	});

	it('不正なスタイルを拒否する', async () => {
		const { extractReferenceStyle } = await import('./reference-style');
		expect(() => extractReferenceStyle({} as StyleSpecification)).toThrow('形式が不正');
	});
});

describe('loadReferenceStyle', () => {
	it('並列取得と成功結果をキャッシュし、呼び出し側の変更から保護する', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify(createStyle())));
		const { loadReferenceStyle } = await import('./reference-style');
		const [first, second] = await Promise.all([
			loadReferenceStyle(),
			loadReferenceStyle()
		]);
		expect(first).toEqual(second);
		expect(first).not.toBe(second);
		if (first.layers[0].type === 'line') first.layers[0].paint!['line-color'] = '#ffffff';
		first.sources['@reference_test-vector'].url = 'https://example.com/test-changed.json';

		expect(await loadReferenceStyle()).toEqual(second);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith('https://example.com/test-style.json', {
			signal: expect.any(AbortSignal)
		});
	});

	it('HTTPエラー後は再取得できる', async () => {
		fetchMock
			.mockResolvedValueOnce(new Response('', { status: 503 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(createStyle())));
		const { loadReferenceStyle } = await import('./reference-style');
		await expect(loadReferenceStyle()).rejects.toThrow('503');
		await expect(loadReferenceStyle()).resolves.toMatchObject({
			layers: expect.any(Array)
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('不正なJSONの応答をキャッシュしない', async () => {
		fetchMock
			.mockResolvedValueOnce(new Response('test-invalid-json'))
			.mockResolvedValueOnce(new Response(JSON.stringify(createStyle())));
		const { loadReferenceStyle } = await import('./reference-style');
		await expect(loadReferenceStyle()).rejects.toThrow();
		await expect(loadReferenceStyle()).resolves.toMatchObject({
			layers: expect.any(Array)
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

describe('selectReferenceStyle', () => {
	it.each(
		[
			[false, false, []],
			[true, false, ['test-road', 'test-rail', 'test-boundary']],
			[false, true, ['label-test-road', 'poi-test-place', 'label-test-poi']],
			[true, true, [
				'test-road',
				'label-test-road',
				'test-rail',
				'test-boundary',
				'poi-test-place',
				'label-test-poi'
			]]
		] as const
	)('line=%s label=%s で地名・POIをまとめて切り替える', async (line, label, ids) => {
		const { extractReferenceStyle, selectReferenceStyle } = await import('./reference-style');
		const style = extractReferenceStyle(createStyle());
		const result = selectReferenceStyle(style, { line, label });
		expect(result.layers.map((layer) => layer.id)).toEqual(ids.map((id) => `@reference_${id}`));
		expect(Object.keys(result.sources).sort()).toEqual([
			...(line || label ? ['@reference_test-vector'] : []),
			...(label ? ['@reference_test-label-vector', '@reference_test-poi-vector'] : [])
		].sort());
	});
});
