import { getProjContext } from '$routes/map/utils/proj/dict';
import { ensureProjNadgridsReady } from '$routes/map/utils/proj/nadgrid';
import { meterInMercatorCoordinateUnits } from '$routes/map/utils/three/mercator-model-matrix';
import { MercatorCoordinate } from 'maplibre-gl';
import proj4 from 'proj4';
import { type Group, Matrix4 } from 'three';
import type { CadGeoreference } from './georeference';

export interface CadModelPlacement {
	lng: number;
	lat: number;
	altitude: number;
	preserveLocalOrigin: true;
}

/** メートル化・原点移動済みのCADモデルを投影原点へ配置する。方位と縮尺は原点付近の投影微分で補正する。 */
export const placeCadModel = async (
	model: Group,
	reference: CadGeoreference
): Promise<CadModelPlacement> => {
	const origin = model.userData.sourceOrigin as [number, number, number];
	const context = getProjContext(reference.epsg);
	await ensureProjNadgridsReady(context);
	const transform = proj4(context, 'EPSG:4326');
	const [lng, lat] = transform.forward(origin.slice(0, 2));
	if (
		![lng, lat, origin[2]].every(Number.isFinite) || Math.abs(lng) > 180
		|| Math.abs(lat) >= 85.051129
	) throw new Error('CADの座標を地図上へ変換できませんでした。');
	const base = MercatorCoordinate.fromLngLat([lng, lat]);
	const scale = meterInMercatorCoordinateUnits(lat);
	const direction = (dx: number, dy: number) => {
		const p = transform.forward([origin[0] + dx, origin[1] + dy]);
		const mercator = MercatorCoordinate.fromLngLat([p[0], p[1]]);
		return [(mercator.x - base.x) / scale, -(mercator.y - base.y) / scale];
	};
	const [ex, ey] = direction(1, 0);
	const [nx, ny] = direction(0, 1);
	// CADのXY平面はGLBではX/-Z。GEODATAのNorthDirectionを二重に適用しない。
	model.applyMatrix4(new Matrix4().set(ex, 0, -nx, 0, 0, 1, 0, 0, -ey, 0, ny, 0, 0, 0, 0, 1));
	model.userData.projectedEpsg = reference.epsg;
	return { lng, lat, altitude: origin[2], preserveLocalOrigin: true };
};
