import type { FilterSpecification, LayerSpecification } from '$routes/map/utils/maplibre';
import type { FeatureCollection } from 'geojson';

export const drawFeatureKey = (id: string | number): string =>
	`${typeof id}-${encodeURIComponent(String(id))}`;

/** featuresの順番を重ね順とし、末尾の地物を最前面に描画する。 */
export const createDrawLayers = (data: FeatureCollection): LayerSpecification[] =>
	data.features.flatMap((feature): LayerSpecification[] => {
		const featureId = feature.properties?.id ?? feature.id;
		if (typeof featureId !== 'string' && typeof featureId !== 'number') return [];
		const common = {
			id: `@draw_${drawFeatureKey(featureId)}`,
			source: 'draw_source',
			filter: ['==', ['coalesce', ['get', 'id'], ['id']], featureId] as FilterSpecification
		};
		switch (feature.geometry.type) {
			case 'Polygon':
				return [{
					...common,
					type: 'fill',
					paint: {
						'fill-color': ['get', 'color'],
						'fill-opacity': ['get', 'opacity'],
						'fill-outline-color': 'transparent'
					}
				}];
			case 'LineString':
				return [{
					...common,
					type: 'line',
					paint: {
						'line-color': ['get', 'color'],
						'line-opacity': ['get', 'opacity'],
						'line-width': 5
					}
				}];
			case 'Point':
				return [{
					...common,
					type: 'circle',
					paint: {
						'circle-color': ['get', 'color'],
						'circle-opacity': ['get', 'opacity'],
						'circle-radius': 7
					}
				}];
			default:
				return [];
		}
	});
