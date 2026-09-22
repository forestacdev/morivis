import type { PoiIconMarkerAppearance } from '$routes/map/types';
import type { Map, MapGeoJSONFeature, PositionAnchor } from '$routes/map/utils/maplibre';

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
		if (!image?.data || image.pixelRatio <= 0) return null;
		const { width, height, data } = image.data;
		const size = finiteNumber(layout['icon-size'], 1);
		if (!width || !height || !data || size <= 0) return null;
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) return null;
		const pixels = new Uint8ClampedArray(data);
		if (image.sdf) {
			// 距離場の背景を除去し、地図側のicon-colorで着色する。
			for (let index = 3; index < pixels.length; index += 4) {
				pixels[index] = Math.max(0, Math.min(255, (pixels[index] - 180) * 12));
			}
		}
		context.putImageData(new ImageData(pixels, width, height), 0, 0);
		if (image.sdf) {
			context.globalCompositeOperation = 'source-in';
			context.fillStyle = String(paint['icon-color'] ?? '#000000');
			context.fillRect(0, 0, width, height);
		}
		const anchor = anchors.includes(layout['icon-anchor'] as PositionAnchor)
			? layout['icon-anchor'] as PositionAnchor
			: 'center';
		const offset = layout['icon-offset'];
		const rotationAlignment = layout['icon-rotation-alignment'] === 'map' ? 'map' : 'viewport';
		return {
			iconImage: canvas.toDataURL('image/png'),
			iconMarker: {
				width: width / image.pixelRatio * size,
				height: height / image.pixelRatio * size,
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
