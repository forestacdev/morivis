import type { StyleSpecification } from '$routes/map/utils/maplibre';
import type { McaRegionPosition } from './types';
import { parseMcaRegionFileName } from './world-placement';

export const MCA_PREVIEW_ZOOM = 18;
const width = 2 ** MCA_PREVIEW_ZOOM;
const middle = width / 2;

export const previewTile = (region: McaRegionPosition, anchor: McaRegionPosition) => ({
	x: region.x - anchor.x + middle,
	y: region.z - anchor.z + middle
});

export const previewLngLat = (x: number, y: number): [number, number] => [
	x / width * 360 - 180,
	Math.atan(Math.sinh(Math.PI * (1 - 2 * y / width))) * 180 / Math.PI
];

export const previewRegion = (lng: number, lat: number, anchor: McaRegionPosition) => ({
	x: Math.floor((lng + 180) / 360 * width) - middle + anchor.x,
	z: Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * width) - middle
		+ anchor.z
});

export const indexPreviewRegions = (files: File[], anchor: McaRegionPosition) => {
	const tiles = new Map<string, { x: number; y: number; files: File[]; }>();
	for (const file of files) {
		const region = parseMcaRegionFileName(file.name);
		if (!region) continue;
		const { x, y } = previewTile(region, anchor);
		if (x < 0 || y < 0 || x >= width || y >= width) continue;
		const key = `${x}/${y}`;
		const existing = tiles.get(key);
		if (existing) existing.files.push(file);
		else tiles.set(key, { x, y, files: [file] });
	}
	return tiles;
};

export const previewMapStyle = (
	protocol: string,
	regions: ReturnType<typeof indexPreviewRegions>,
	anchor: McaRegionPosition,
	excluded: File[]
): StyleSpecification => {
	const omitted = new Set(excluded);
	const origin = previewTile({ x: 0, z: 0 }, anchor);
	return {
		version: 8,
		sources: {
			surface: {
				type: 'raster',
				tiles: [`${protocol}://tile/{z}/{x}/{y}`],
				minzoom: MCA_PREVIEW_ZOOM,
				maxzoom: MCA_PREVIEW_ZOOM,
				// 最も引いた時は32 CSS pxの区画。画像そのものは常に512×512。
				tileSize: 32
			},
			regions: {
				type: 'geojson',
				maxzoom: MCA_PREVIEW_ZOOM,
				tolerance: 0,
				data: {
					type: 'FeatureCollection',
					features: [...regions.values()].map(({ x, y, files }) => ({
						type: 'Feature',
						properties: { selected: files.some(file => !omitted.has(file)) },
						geometry: {
							type: 'Polygon',
							coordinates: [[
								previewLngLat(x, y),
								previewLngLat(x + 1, y),
								previewLngLat(x + 1, y + 1),
								previewLngLat(x, y + 1),
								previewLngLat(x, y)
							]]
						}
					}))
				}
			},
			regionLabels: {
				type: 'geojson',
				maxzoom: MCA_PREVIEW_ZOOM,
				data: {
					type: 'FeatureCollection',
					features: [...regions.values()].map(({ x, y, files }) => ({
						type: 'Feature',
						properties: { name: files[0].name },
						geometry: { type: 'Point', coordinates: previewLngLat(x + 0.5, y + 0.5) }
					}))
				}
			},
			origin: {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: origin.x >= 0 && origin.y >= 0 && origin.x < width && origin.y < width
						? [{
							type: 'Feature',
							properties: {},
							geometry: {
								type: 'Point',
								coordinates: previewLngLat(origin.x, origin.y)
							}
						}]
						: []
				}
			}
		},
		layers: [
			{ id: 'background', type: 'background', paint: { 'background-color': '#1f2937' } },
			{
				id: 'surface',
				type: 'raster',
				source: 'surface',
				paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0 }
			},
			{
				id: 'excluded',
				type: 'fill',
				source: 'regions',
				filter: ['==', ['get', 'selected'], false],
				paint: { 'fill-color': '#111827', 'fill-opacity': 0.65 }
			},
			{
				id: 'bounds',
				type: 'line',
				source: 'regions',
				paint: {
					'line-color': ['case', ['get', 'selected'], '#67e8f9', '#94a3b8'],
					'line-width': 2
				}
			},
			{
				id: 'region-labels',
				type: 'symbol',
				source: 'regionLabels',
				layout: {
					'text-field': ['get', 'name'],
					'text-font': ['sans-serif'],
					'text-size': [
						'interpolate',
						['linear'],
						['zoom'],
						MCA_PREVIEW_ZOOM - 4,
						9,
						MCA_PREVIEW_ZOOM - 2,
						12
					],
					'text-variable-anchor': ['center', 'top', 'bottom'],
					'text-padding': 1
				},
				paint: {
					'text-color': '#ffffff',
					'text-halo-color': '#111827',
					'text-halo-width': 1.5
				}
			},
			{
				id: 'origin',
				type: 'circle',
				source: 'origin',
				paint: { 'circle-radius': 4, 'circle-color': '#fbbf24', 'circle-stroke-width': 1 }
			}
		]
	};
};
