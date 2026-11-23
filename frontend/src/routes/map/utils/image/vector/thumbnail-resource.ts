import { mbtilesProtocol } from '$routes/map/protocol/mbtiles';
import { esriFeatureProtocol } from '$routes/map/protocol/vector/esri-feature';
import { geojsonProtocol } from '$routes/map/protocol/vector/geojson';
import { requestLocalMvt } from '$routes/map/protocol/vector/local-mvt';
import { ogcFeatureProtocol } from '$routes/map/protocol/vector/ogc-feature';
import { wfsFeatureProtocol } from '$routes/map/protocol/vector/wfs-feature';
import type { StyleSpecification } from '$routes/map/utils/maplibre';
import { resolveRequestUrl } from '$routes/map/utils/platform/request';
import { Protocol, TileType } from 'pmtiles';
import { MLT_RESOURCE_PREFIX, type ThumbnailResource } from './thumbnail';

const pmtiles = new Protocol();
const protocols = new Map([
	mbtilesProtocol(),
	geojsonProtocol('geojson'),
	esriFeatureProtocol('esri-feature'),
	ogcFeatureProtocol('ogc-feature'),
	wfsFeatureProtocol('wfs-feature')
].map(protocol => [protocol.protocolName, protocol.request]));

/** メインスレッドのFile・SQLite・結合データのキャッシュを地図と共有する。 */
export const createThumbnailResourceLoader = (style: StyleSpecification, baseUrl: string) => {
	const sourceUrls = new Set(
		Object.values(style.sources).flatMap(source =>
			'url' in source && source.url ? [source.url] : []
		)
	);
	return async (resourceUrl: string, controller: AbortController): Promise<ThumbnailResource> => {
		controller.signal.throwIfAborted();
		let encoding: 'mlt' | undefined;
		let url = resourceUrl;
		if (url.startsWith(MLT_RESOURCE_PREFIX)) {
			encoding = 'mlt';
			url = url.slice(MLT_RESOURCE_PREFIX.length);
		}
		let bytes: Uint8Array<ArrayBuffer> | null;
		if (url.startsWith('pmtiles://')) {
			const isSource = sourceUrls.has(url);
			const result = await pmtiles.tilev4(
				{ url, type: isSource ? 'json' : 'arrayBuffer' },
				controller
			);
			if (isSource) {
				bytes = new TextEncoder().encode(JSON.stringify(result.data));
			} else {
				bytes = result.data instanceof Uint8Array && result.data.length
					? new Uint8Array(result.data)
					: null;
				const archiveUrl = url.slice('pmtiles://'.length).replace(/\/\d+\/\d+\/\d+$/, '');
				if ((await pmtiles.get(archiveUrl)?.getHeader())?.tileType === TileType.Mlt) {
					encoding = 'mlt';
				}
			}
		} else if (url.startsWith('local-mvt://')) {
			const result = await requestLocalMvt({ url }, controller);
			bytes = result.data.byteLength ? new Uint8Array(result.data) : null;
		} else {
			const handler = protocols.get(url.split('://')[0]);
			if (handler) {
				const result = await handler({ url }, controller);
				// キャッシュのバッファをWorkerへのtransferで切り離さない。
				bytes = result.data.length ? new Uint8Array(result.data) : null;
			} else {
				const response = await fetch(new URL(resolveRequestUrl(url), baseUrl), {
					signal: controller.signal
				});
				if (response.status === 404) return { bytes: null };
				if (!response.ok) {
					throw new Error(`Thumbnail resource HTTP ${response.status}: ${url}`);
				}
				const buffer = await response.arrayBuffer();
				bytes = buffer.byteLength ? new Uint8Array(buffer) : null;
			}
		}
		controller.signal.throwIfAborted();
		return { bytes, encoding };
	};
};
