import { DEFAULT_DEM_SHADOW_STYLE, type DemShadowStyle } from '$routes/map/data/types/raster';

export const normalizeDemShadowStyle = (style?: Partial<DemShadowStyle>): DemShadowStyle => {
	const { azimuth, altitude } = { ...DEFAULT_DEM_SHADOW_STYLE, ...style };
	return {
		azimuth: Number.isFinite(azimuth)
			? ((azimuth % 360) + 360) % 360
			: DEFAULT_DEM_SHADOW_STYLE.azimuth,
		altitude: Number.isFinite(altitude)
			? Math.min(90, Math.max(0, altitude))
			: DEFAULT_DEM_SHADOW_STYLE.altitude
	};
};

/** シェーダーと共通の軸: X=東、Y=上、Z=南。 */
export const getDemLightDirection = (style?: Partial<DemShadowStyle>): [number, number, number] => {
	const { azimuth, altitude } = normalizeDemShadowStyle(style);
	const azimuthRad = azimuth * Math.PI / 180;
	const altitudeRad = altitude * Math.PI / 180;
	return [
		Math.cos(altitudeRad) * Math.sin(azimuthRad),
		Math.sin(altitudeRad),
		-Math.cos(altitudeRad) * Math.cos(azimuthRad)
	];
};
