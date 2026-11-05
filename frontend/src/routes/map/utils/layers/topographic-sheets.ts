import { TOPOGRAPHIC_SHEET_SCALES } from '$routes/map/protocol/vector/geojson/topographic-sheets/config';
import type {
	DataDrivenPropertyValueSpecification,
	LayerSpecification,
	SourceSpecification
} from '$routes/map/utils/maplibre';

export const createTopographicSheetsStyle = (
	enabled: boolean,
	textFont: DataDrivenPropertyValueSpecification<string[]>
) => {
	const sources: Record<string, SourceSpecification> = {};
	const layers: LayerSpecification[] = [];
	if (!enabled) return { sources, layers };
	for (const { scale, minzoom, maxzoom, tileMaxZoom, color } of TOPOGRAPHIC_SHEET_SCALES) {
		const source = `topographic-sheets-${scale}`;
		sources[source] = {
			type: 'vector',
			minzoom,
			maxzoom: tileMaxZoom,
			tiles: [
				`geojson://https://maps.gsi.go.jp/xyz/zk${scale}/{z}/{x}/{y}.geojson?x={x}&y={y}&z={z}&transform=topographic-sheets`
			],
			attribution: '<a href="https://maps.gsi.go.jp/">国土地理院</a>'
		};
		const base = { source, 'source-layer': 'geojsonLayer', minzoom, maxzoom };
		layers.push(
			{
				...base,
				id: `${source}-line`,
				type: 'line',
				filter: ['==', '$type', 'LineString'],
				paint: {
					'line-color': color,
					'line-width': 1.5,
					...(scale !== 25000 ? { 'line-dasharray': [3, 3] } : {})
				}
			},
			{
				...base,
				id: `${source}-label`,
				type: 'symbol',
				filter: ['==', '$type', 'Point'],
				layout: {
					'text-field': ['get', 'name'],
					'text-font': textFont,
					'text-size': 14,
					'text-max-width': 12
				},
				paint: { 'text-color': color, 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 }
			}
		);
	}
	return { sources, layers };
};
