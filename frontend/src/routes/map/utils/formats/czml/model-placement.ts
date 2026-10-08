import { Matrix4, Vector3 } from 'three';
import type { CzmlModelFrame } from './model-types';

const circumference = 40075016.68557849;
const mercator = (lng: number, lat: number) => [
	(lng + 180) / 360,
	(1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2
];

/** Mercator上の配置を、entry原点を基準とするEast/Up/Southのメートル座標に変換する。 */
export const czmlModelMatrix = (frame: CzmlModelFrame, origin: [number, number]): number[] => {
	const [lng, lat, altitude] = frame.position;
	if (Math.abs(lat) > 85.05112878 || Math.abs(origin[1]) > 85.05112878) {
		throw new Error('CZMLのモデル位置がWeb Mercatorの表示範囲外です');
	}
	const anchor = mercator(...origin);
	const point = mercator(lng, lat);
	const meters = circumference * Math.cos(origin[1] * Math.PI / 180);
	const relativeScale = Math.cos(origin[1] * Math.PI / 180) / Math.cos(lat * Math.PI / 180);
	const r = frame.rotation;
	const rotation = new Matrix4().set(
		r[0],
		r[3],
		r[6],
		0,
		r[1],
		r[4],
		r[7],
		0,
		r[2],
		r[5],
		r[8],
		0,
		0,
		0,
		0,
		1
	);
	return new Matrix4().makeTranslation(
		(point[0] - anchor[0]) * meters,
		altitude * relativeScale,
		(point[1] - anchor[1]) * meters
	).multiply(new Matrix4().makeRotationX(-Math.PI / 2)).multiply(rotation)
		.scale(new Vector3().setScalar(frame.scale * relativeScale)).toArray();
};
