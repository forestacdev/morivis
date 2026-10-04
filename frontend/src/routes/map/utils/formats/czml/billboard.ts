import type { FeatureProp } from '$routes/map/types/properties';
import type { Entity, JulianDate } from '@cesium/engine';

/** 画像を取得せず、Cesiumが評価したbillboardの宣言値だけをWorkerから返す。 */
export const evaluateCzmlBillboard = (
	entity: Entity,
	time: JulianDate
): FeatureProp | undefined => {
	const billboard = entity.billboard;
	if (!billboard || billboard.show?.getValue(time) === false) return;
	const image = billboard.image?.getValue(time);
	const uri = typeof image === 'string' ? image : image?.url;
	if (typeof uri !== 'string' || !uri.trim()) return;
	const color = billboard.color?.getValue(time);
	const offset = billboard.pixelOffset?.getValue(time);
	const properties: FeatureProp = {
		billboard_image: uri,
		billboard_scale: billboard.scale?.getValue(time) ?? 1,
		billboard_rotation: billboard.rotation?.getValue(time) ?? 0,
		billboard_origin_x: billboard.horizontalOrigin?.getValue(time) ?? 0,
		billboard_origin_y: billboard.verticalOrigin?.getValue(time) ?? 0,
		billboard_offset_x: offset?.x ?? 0,
		billboard_offset_y: offset?.y ?? 0,
		billboard_red: color?.red ?? 1,
		billboard_green: color?.green ?? 1,
		billboard_blue: color?.blue ?? 1,
		billboard_alpha: color?.alpha ?? 1
	};
	for (const key of ['width', 'height'] as const) {
		const value = billboard[key]?.getValue(time);
		if (value !== undefined) properties[`billboard_${key}`] = value;
	}
	for (const [key, value] of Object.entries(properties)) {
		if (key !== 'billboard_image' && (typeof value !== 'number' || !Number.isFinite(value))) {
			throw new Error('CZML画像マーカーのサイズ・色・配置に不正な値があります');
		}
	}
	if (['scale', 'width', 'height'].some(key => Number(properties[`billboard_${key}`] ?? 1) < 0)) {
		throw new Error('CZML画像マーカーのサイズ・縮尺には0以上を指定してください');
	}
	if (
		['red', 'green', 'blue', 'alpha'].some(key => {
			const value = Number(properties[`billboard_${key}`]);
			return value < 0 || value > 1;
		})
	) throw new Error('CZML画像マーカーの色は0〜1（rgbaでは0〜255）で指定してください');
	if (
		properties.billboard_scale === 0 || properties.billboard_width === 0
		|| properties.billboard_height === 0 || properties.billboard_alpha === 0
	) return;
	return properties;
};
