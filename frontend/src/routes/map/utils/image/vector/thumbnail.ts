import type { LayerSpecification, StyleSpecification } from '$routes/map/utils/maplibre';
import type { View } from '@ml2drender/wasm';
import { MercatorCoordinate } from 'maplibre-gl';

export interface ThumbnailRequest {
	styleJson: string;
	view: View;
	baseUrl: string;
}

export interface ThumbnailResource {
	bytes: Uint8Array<ArrayBuffer> | null;
	encoding?: 'mlt';
}

export interface ThumbnailResourceRequest {
	type: 'resource';
	id: number;
	url: string;
}

export type ThumbnailResourceResponse =
	& { type: 'resource'; id: number; }
	& (
		| ThumbnailResource
		| { error: string; }
	);

export const MLT_RESOURCE_PREFIX = 'thumbnail-mlt://';

const MAX_LATITUDE = 85.0511287798066;
const clampLatitude = (latitude: number) =>
	Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));

/** MapLibreのfitBoundsと同じく、範囲全体を正方形に収める。 */
export const createThumbnailView = (bounds: [number, number, number, number]): View => {
	const [west, south, east, north] = bounds;
	if (!bounds.every(Number.isFinite) || south > north) {
		throw new Error('サムネイルの描画範囲が不正です');
	}
	const southWest = MercatorCoordinate.fromLngLat([west, clampLatitude(south)]);
	const northEast = MercatorCoordinate.fromLngLat([
		east < west ? east + 360 : east,
		clampLatitude(north)
	]);
	const span = Math.max(northEast.x - southWest.x, southWest.y - northEast.y);
	const center = new MercatorCoordinate(
		(southWest.x + northEast.x) / 2,
		(southWest.y + northEast.y) / 2
	).toLngLat();
	return {
		center: center.toArray(),
		zoom: Math.max(0, Math.min(22, Math.log2(1 / span))),
		width: 512,
		height: 512,
		pixelRatio: 1,
		bearing: 0
	};
};

/** 立体ポリゴンの上面を2D画像にも残す。式・filter・ズーム範囲は引き継ぐ。 */
const toThumbnailLayer = (layer: LayerSpecification): LayerSpecification => {
	if (layer.type !== 'fill-extrusion') return layer;
	const paint = layer.paint ?? {};
	const properties = ['color', 'opacity', 'pattern', 'translate', 'translate-anchor'];
	return {
		...layer,
		type: 'fill',
		layout: { visibility: layer.layout?.visibility },
		paint: Object.fromEntries(
			Object.entries(paint)
				.filter(([key]) =>
					properties.some(property => key === `fill-extrusion-${property}`)
				)
				.map(([key, value]) => [key.replace('fill-extrusion-', 'fill-'), value])
		)
	};
};

export const createThumbnailStyle = (style: StyleSpecification): StyleSpecification => ({
	...style,
	sources: Object.fromEntries(
		Object.entries(style.sources).map(([id, source]) => [
			id,
			source.type === 'vector' && source.encoding === 'mlt'
				? {
					...source,
					encoding: 'mvt',
					tiles: source.tiles?.map(url => `${MLT_RESOURCE_PREFIX}${url}`)
				}
				: source
		])
	),
	layers: style.layers.map(toThumbnailLayer)
});
