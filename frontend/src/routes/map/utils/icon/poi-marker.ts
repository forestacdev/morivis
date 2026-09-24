import type { PoiIconMarkerAppearance } from '$routes/map/types';
import type { Map, MapGeoJSONFeature, PositionAnchor } from '$routes/map/utils/maplibre';
import { POI_HIGHLIGHT_SCALE, rasterizePoiSdf } from './poi-marker-image';

const finiteNumber = (value: unknown, fallback: number): number =>
	typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const anchors: PositionAnchor[] = [
	'center',
	'top',
	'bottom',
	'left',
	'right',
	'top-left',
	'top-right',
	'bottom-left',
	'bottom-right'
];

/** queryRenderedFeaturesの評価済みlayoutと、地図に登録済みの画像からマーカーを作る。 */
export const createPoiIconMarker = (
	map: Pick<Map, 'getImage'>,
	feature: MapGeoJSONFeature
): { iconImage: string; iconMarker: PoiIconMarkerAppearance; } | null => {
	if (feature.layer.type !== 'symbol' || feature.geometry.type !== 'Point') return null;
	const layout = feature.layer.layout ?? {};
	const paint = feature.layer.paint ?? {};
	const resolvedImage: unknown = layout['icon-image'];
	const name = typeof resolvedImage === 'string'
		? resolvedImage
		: resolvedImage && typeof resolvedImage === 'object' && 'name' in resolvedImage
				&& typeof resolvedImage.name === 'string'
		? resolvedImage.name
		: '';
	const imageId = name.replace(
		/\{([^}]+)\}/g,
		(_, key: string) => String(feature.properties[key] ?? '')
	);
	if (!imageId) return null;
	try {
		const image = map.getImage(imageId);
		if (!image?.data || finiteNumber(image.pixelRatio, 0) <= 0) return null;
		const { width, height, data } = image.data;
		const size = finiteNumber(layout['icon-size'], 1);
		if (!width || !height || !data || size <= 0) return null;
		const displayWidth = width / image.pixelRatio * size;
		const displayHeight = height / image.pixelRatio * size;
		const deviceScale = Math.max(1, finiteNumber(globalThis.devicePixelRatio, 1));
		const canvas = document.createElement('canvas');
		// 通常のビットマップは元画像を保持。SDFは距離情報から表示解像度で再描画する。
		canvas.width = image.sdf
			? Math.ceil(displayWidth * POI_HIGHLIGHT_SCALE * deviceScale)
			: width;
		canvas.height = image.sdf
			? Math.ceil(displayHeight * POI_HIGHLIGHT_SCALE * deviceScale)
			: height;
		const context = canvas.getContext('2d');
		if (!context) return null;
		const pixels = image.sdf
			? rasterizePoiSdf(data, width, height, canvas.width, canvas.height, image.pixelRatio)
			: new Uint8ClampedArray(data);
		context.putImageData(new ImageData(pixels, canvas.width, canvas.height), 0, 0);
		if (image.sdf) {
			context.globalCompositeOperation = 'source-in';
			context.fillStyle = String(paint['icon-color'] ?? '#000000');
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
		const anchor = anchors.includes(layout['icon-anchor'] as PositionAnchor)
			? layout['icon-anchor'] as PositionAnchor
			: 'center';
		const offset = layout['icon-offset'];
		const rotationAlignment = layout['icon-rotation-alignment'] === 'map' ? 'map' : 'viewport';
		return {
			iconImage: canvas.toDataURL('image/png'),
			iconMarker: {
				width: displayWidth,
				height: displayHeight,
				anchor,
				offset: Array.isArray(offset)
					? [finiteNumber(offset[0], 0) * size, finiteNumber(offset[1], 0) * size]
					: [0, 0],
				rotation: finiteNumber(layout['icon-rotate'], 0),
				rotationAlignment,
				pitchAlignment: layout['icon-pitch-alignment'] === 'map'
					? 'map'
					: layout['icon-pitch-alignment'] === 'viewport'
					? 'viewport'
					: rotationAlignment,
				opacity: finiteNumber(paint['icon-opacity'], 1)
			}
		};
	} catch {
		// 画像が利用できない場合は、呼び出し側の通常の選択マーカーを使う。
		return null;
	}
};
