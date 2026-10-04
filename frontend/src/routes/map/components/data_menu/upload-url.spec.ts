import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$routes/map/utils/formats/geotiff/probe-cog', () => ({ probeCogUrl: vi.fn() }));

vi.mock('$routes/map/utils/formats/ogc-api-features', () => ({
	parseOgcApiFeaturesService: vi.fn()
}));

vi.mock('$routes/map/utils/formats/wfs', () => ({
	parseWfsCapabilities: vi.fn(),
	looksLikeWfsUrl: vi.fn(() => false)
}));

vi.mock('$routes/map/utils/formats/wms', () => ({
	parseWmsCapabilities: vi.fn()
}));

vi.mock('$routes/map/utils/formats/wmts', () => ({
	parseWmtsCapabilities: vi.fn()
}));

import { probeCogUrl } from '$routes/map/utils/formats/geotiff/probe-cog';
import { parseOgcApiFeaturesService } from '$routes/map/utils/formats/ogc-api-features';
import { parseWfsCapabilities } from '$routes/map/utils/formats/wfs';
import { parseWmsCapabilities } from '$routes/map/utils/formats/wms';
import { parseWmtsCapabilities } from '$routes/map/utils/formats/wmts';
import { getRemoteFileName, resolveUploadUrlInput } from './upload-url';

describe('resolveUploadUrlInput', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		'https://test.invalid/csw',
		'https://test.invalid/catalog?SERVICE=CSW&REQUEST=GetCapabilities',
		'https://test.invalid/catalog/srv/eng/csw?token=test'
	])('CSW URLを配信サービスへの問い合わせ前にカタログへ渡す: %s', async (url) => {
		expect(await resolveUploadUrlInput(url)).toEqual({
			type: 'dialog',
			dialogType: 'csw',
			target: 'remoteCswUrl',
			value: url
		});
		expect(parseWmtsCapabilities).not.toHaveBeenCalled();
		expect(parseWmsCapabilities).not.toHaveBeenCalled();
		expect(parseWfsCapabilities).not.toHaveBeenCalled();
		expect(parseOgcApiFeaturesService).not.toHaveBeenCalled();
	});

	it.each(['test.tif', 'test.TIFF?key=test#test', 'test%2Etif'])(
		'TIFFはサービス問い合わせ前に部分取得で判定する: %s',
		async (path) => {
			vi.mocked(probeCogUrl).mockResolvedValue('cog');
			const url = `https://example.com/${path}`;
			expect(await resolveUploadUrlInput(url)).toMatchObject({
				type: 'dialog',
				dialogType: 'stac',
				target: 'remoteStacUrl'
			});
			expect(probeCogUrl).toHaveBeenCalledOnce();
			expect(parseWmtsCapabilities).not.toHaveBeenCalled();
			expect(parseWmsCapabilities).not.toHaveBeenCalled();
			expect(parseWfsCapabilities).not.toHaveBeenCalled();
			expect(parseOgcApiFeaturesService).not.toHaveBeenCalled();
		}
	);

	it.each([
		'https://test-zarr.invalid/test.zarr',
		'https://test-zarr.invalid/test.zarr/temperature/zarr.json?key=test',
		'https://test-zarr.invalid/data/.zmetadata'
	])('Zarr URLをファイル取得せず専用フォームへ渡す: %s', async url => {
		expect(await resolveUploadUrlInput(url)).toMatchObject({
			type: 'dialog',
			dialogType: 'geozarr',
			target: 'remoteGeoZarrUrl',
			value: url
		});
		expect(parseWmsCapabilities).not.toHaveBeenCalled();
	});

	it('通常TIFFはサービス探索をせずファイル取り込みへ進む', async () => {
		vi.mocked(probeCogUrl).mockResolvedValue('geotiff');
		const url = 'https://example.com/test.tif';
		expect(await resolveUploadUrlInput(url)).toEqual({ type: 'remote-file', requestUrl: url });
		expect(parseWmtsCapabilities).not.toHaveBeenCalled();
	});

	it('TIFF判定の通信失敗時は全体ダウンロードへ進まない', async () => {
		vi.mocked(probeCogUrl).mockRejectedValue(new Error('test-network-error'));
		expect(await resolveUploadUrlInput('https://example.com/test.tif')).toMatchObject({
			type: 'error'
		});
		expect(parseWmtsCapabilities).not.toHaveBeenCalled();
	});

	it('TIFFのXYZテンプレートは単体COGと判定しない', async () => {
		expect(await resolveUploadUrlInput('https://example.com/{z}/{x}/{y}.tif')).toMatchObject({
			type: 'dialog',
			dialogType: 'tileurltype'
		});
		expect(probeCogUrl).not.toHaveBeenCalled();
	});

	it.each([
		'https://example.com/arcgis/rest/services/test-imagery/MapServer',
		'https://example.com/arcgis/rest/services/test-imagery/MapServer/',
		'https://example.com/arcgis/rest/services/test-imagery/MapServer?f=pjson',
		'https://example.com/arcgis/rest/services/test-imagery/MapServer/?f=pjson',
		'https://example.com/arcgis/rest/services/test-imagery/MapServer/0',
		'https://example.com/arcgis/rest/services/test-features/FeatureServer',
		'https://example.com/arcgis/rest/services/test-features/FeatureServer/2',
		'https://example.com/arcgis/rest/services/test-features/FeatureServer/2/query?f=json'
	])('ArcGISサービスURLを専用フォームへ渡す: %s', async (url) => {
		await expect(resolveUploadUrlInput(url)).resolves.toEqual({
			type: 'dialog',
			dialogType: 'arcgis',
			target: 'remoteArcGisUrl',
			value: url
		});
		expect(parseWmtsCapabilities).not.toHaveBeenCalled();
		expect(parseWmsCapabilities).not.toHaveBeenCalled();
		expect(parseOgcApiFeaturesService).not.toHaveBeenCalled();
		expect(parseWfsCapabilities).not.toHaveBeenCalled();
	});

	it('ArcGISのXYZタイルURLは既存のタイル判定を使う', async () => {
		const url =
			'https://example.com/arcgis/rest/services/test-imagery/MapServer/tile/{z}/{y}/{x}';
		await expect(resolveUploadUrlInput(url)).resolves.toEqual({
			type: 'dialog',
			dialogType: 'tileurltype',
			target: 'pendingTileUrl',
			value: url
		});
	});

	it.each([
		'https://example.com/test-MapServer',
		'https://example.com/test-file?service=/MapServer',
		'https://example.com/arcgis/rest/services/test-imagery/MapServer/WMSServer'
	])('サービス名を含むだけのURLはArcGISと誤判定しない: %s', async (url) => {
		await expect(resolveUploadUrlInput(url)).resolves.toEqual({
			type: 'remote-file',
			requestUrl: url
		});
		expect(parseWmtsCapabilities).toHaveBeenCalled();
	});

	it('GeoRSS拡張子のURLは remote-file として扱う', async () => {
		const result = await resolveUploadUrlInput('https://example.com/feed.rss');

		expect(result).toEqual({
			type: 'remote-file',
			requestUrl: 'https://example.com/feed.rss'
		});
		expect(parseWmtsCapabilities).not.toHaveBeenCalled();
		expect(parseWmsCapabilities).not.toHaveBeenCalled();
		expect(parseOgcApiFeaturesService).not.toHaveBeenCalled();
		expect(parseWfsCapabilities).not.toHaveBeenCalled();
	});
});

describe('getRemoteFileName', () => {
	it('Content-Type が RSS なら拡張子なしURLでも .rss を補う', async () => {
		const response = new Response('<rss />', {
			headers: {
				'content-type': 'application/rss+xml; charset=utf-8'
			}
		});

		await expect(getRemoteFileName('https://example.com/feed', response)).resolves.toBe(
			'feed.rss'
		);
	});

	it('GeoRSS XML 本文を見て .rss を補える', async () => {
		const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:georss="http://www.georss.org/georss">
	<channel>
		<item><georss:point>35 139</georss:point></item>
	</channel>
</rss>`;
		const blob = new Blob([body], { type: 'text/xml' });
		const response = new Response(body, {
			headers: {
				'content-type': 'text/xml; charset=utf-8'
			}
		});

		await expect(
			getRemoteFileName('https://example.com/api/feed', response, blob)
		).resolves.toBe('feed.rss');
	});
});
