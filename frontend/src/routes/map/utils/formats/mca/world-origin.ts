import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
import type { GeoJsonMetaData, VectorPointEntry } from '$routes/map/data/types/vector';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { PointGeometry } from '$routes/map/types/geometry';
import { getModelUnitMeters } from '$routes/map/utils/three/model-scale';
import { validateMcaWorldPlacement } from './world-placement';

/** ワールド座標での位置合わせ中だけ表示する、X=0・Z=0のガイド。 */
export const createMcaWorldOrigin = (model: MeshEntry<MeshStyle>) => {
	const { lng, lat } = model.style.transform;
	if (
		!model.format.minecraftRegion || model.style.visible === false
		|| validateMcaWorldPlacement({
			lng,
			lat,
			metersPerBlock: getModelUnitMeters(model.style.transform)
		})
	) return null;
	const data: FeatureCollection<PointGeometry> = {
		type: 'FeatureCollection',
		features: [{
			type: 'Feature',
			id: 'world-origin',
			properties: { name: 'ワールド原点' },
			geometry: { type: 'Point', coordinates: [lng, lat] }
		}]
	};
	const entry: VectorPointEntry<GeoJsonMetaData> = {
		id: `${model.id}_minecraft_origin`,
		type: 'vector',
		format: { type: 'geojson', geometryType: 'Point', url: '' },
		metaData: {
			...DEFAULT_CUSTOM_META_DATA,
			name: 'ワールド原点',
			bounds: [lng, lat, lng, lat],
			description:
				'Minecraftのワールド原点を示すポイント。ワールド座標で位置を合わせる際の基準として利用する。'
		},
		interaction: { clickable: false },
		properties: {
			fields: [{ key: 'name', label: '名称', type: 'string' }],
			attributeView: { popupKeys: [], titles: [] }
		},
		style: {
			type: 'circle',
			visible: true,
			opacity: 1,
			colors: {
				show: true,
				key: 'origin',
				expressions: [{
					type: 'single',
					key: 'origin',
					name: '原点',
					mapping: { value: '#ff7f00', pattern: null }
				}]
			},
			radius: {
				key: 'origin',
				expressions: [{
					type: 'single',
					key: 'origin',
					name: '原点',
					mapping: { value: 7 }
				}]
			},
			outline: { show: true, color: '#ffffff', width: 2 },
			labels: {
				show: true,
				key: 'name',
				expressions: [{ key: 'name', name: '名称' }]
			},
			default: {
				symbol: {
					paint: {
						'text-color': '#000000',
						'text-halo-color': '#ffffff',
						'text-halo-width': 2
					},
					layout: {
						'text-size': 13,
						'text-anchor': 'top',
						'text-offset': [0, 1],
						'text-allow-overlap': true,
						'text-ignore-placement': true
					}
				}
			}
		}
	};
	return { entry, data };
};
