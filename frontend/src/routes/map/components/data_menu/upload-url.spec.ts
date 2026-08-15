import { describe, expect, it, vi } from 'vitest';

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

import { parseOgcApiFeaturesService } from '$routes/map/utils/formats/ogc-api-features';
import { parseWfsCapabilities } from '$routes/map/utils/formats/wfs';
import { parseWmsCapabilities } from '$routes/map/utils/formats/wms';
import { parseWmtsCapabilities } from '$routes/map/utils/formats/wmts';
import { getRemoteFileName, resolveUploadUrlInput } from './upload-url';

describe('resolveUploadUrlInput', () => {
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
