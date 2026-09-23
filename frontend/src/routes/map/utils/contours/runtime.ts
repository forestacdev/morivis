import mlcontour from 'maplibre-contour';
import { CONTOUR_OPTIONS, MAPTERHORN_DEM_SOURCE } from './config';

type ProtocolRegistry = Pick<
	typeof import('$routes/map/utils/maplibre'),
	'addProtocol' | 'removeProtocol'
>;

let demSource: InstanceType<typeof mlcontour.DemSource> | undefined;
let registered = false;

export const ensureContourProtocol = (maplibre: ProtocolRegistry) => {
	// ライブラリの共有Workerには破棄APIがないため、DemSourceも1つだけ保持して再利用する。
	// 表示切替や地図の再作成でWorker側のDEMキャッシュを増殖させない。
	demSource ??= new mlcontour.DemSource({
		id: 'morivis-dem',
		url: MAPTERHORN_DEM_SOURCE.tiles[0],
		encoding: MAPTERHORN_DEM_SOURCE.encoding,
		maxzoom: MAPTERHORN_DEM_SOURCE.maxzoom,
		worker: true,
		cacheSize: 100,
		timeoutMs: 30_000
	});
	const source = demSource;
	if (!registered) {
		maplibre.addProtocol(source.contourProtocolId, async (request, controller) => {
			const { data } = await source.contourProtocolV4(request, controller);
			return { data };
		});
		maplibre.addProtocol(source.sharedDemProtocolId, async (request, controller) => {
			const { data, cacheControl, expires } = await source.sharedDemProtocolV4(
				request,
				controller
			);
			return {
				data,
				cacheControl: cacheControl ?? undefined,
				expires: expires instanceof Date ? expires.toUTCString() : expires ?? undefined
			};
		});
		registered = true;
	}
	return {
		contourTiles: source.contourProtocolUrl(CONTOUR_OPTIONS),
		sharedDemTiles: source.sharedDemProtocolUrl
	};
};

export const releaseContourProtocol = (maplibre: ProtocolRegistry) => {
	if (!registered || !demSource) return;
	maplibre.removeProtocol(demSource.contourProtocolId);
	maplibre.removeProtocol(demSource.sharedDemProtocolId);
	registered = false;
};
