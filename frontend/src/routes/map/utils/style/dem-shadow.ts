import { DEFAULT_DEM_SHADOW_STYLE, type DemShadowStyle } from '$routes/map/data/types/raster';

const normalizeColor = (color: string | undefined, fallback: string): string => {
	if (typeof color !== 'string') return fallback;
	if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
	if (/^#[0-9a-f]{3}$/i.test(color)) {
		return '#' + [...color.slice(1)].map((digit) => digit + digit).join('').toLowerCase();
	}
	return fallback;
};

export const normalizeDemShadowStyle = (
	style?: Partial<DemShadowStyle>
): Required<DemShadowStyle> => {
	const { azimuth, altitude } = { ...DEFAULT_DEM_SHADOW_STYLE, ...style };
	return {
		azimuth: Number.isFinite(azimuth)
			? ((azimuth % 360) + 360) % 360
			: DEFAULT_DEM_SHADOW_STYLE.azimuth,
		altitude: Number.isFinite(altitude)
			? Math.min(90, Math.max(0, altitude))
			: DEFAULT_DEM_SHADOW_STYLE.altitude,
		shadowColor: normalizeColor(style?.shadowColor, DEFAULT_DEM_SHADOW_STYLE.shadowColor),
		baseColor: normalizeColor(style?.baseColor, DEFAULT_DEM_SHADOW_STYLE.baseColor),
		baseTransparent: style?.baseTransparent === true
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

/** WebGL に渡す RGBA。透明時も設定済みのベース色は保持する。 */
export const getDemShadowColors = (style?: Partial<DemShadowStyle>) => {
	const { shadowColor, baseColor, baseTransparent } = normalizeDemShadowStyle(style);
	const rgba = (hex: string, alpha: number): [number, number, number, number] => [
		parseInt(hex.slice(1, 3), 16) / 255,
		parseInt(hex.slice(3, 5), 16) / 255,
		parseInt(hex.slice(5, 7), 16) / 255,
		alpha
	];
	return { shadow: rgba(shadowColor, 1), base: rgba(baseColor, baseTransparent ? 0 : 1) };
};
