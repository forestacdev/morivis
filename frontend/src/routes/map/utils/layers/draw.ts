export const drawLayers = [
	{
		id: '@draw_fill_layer',
		type: 'fill',
		source: 'draw_source',
		paint: {
			'fill-color': ['get', 'color'],
			'fill-opacity': ['get', 'opacity'],
			'fill-outline-color': 'transparent'
		},
		filter: ['==', '$type', 'Polygon']
	},
	{
		id: '@draw_line_layer',
		type: 'line',
		source: 'draw_source',
		paint: {
			'line-color': ['get', 'color'],
			'line-opacity': ['get', 'opacity'],
			'line-width': 5
		},
		filter: ['==', '$type', 'LineString']
	},
	{
		id: '@draw_circle_layer',
		type: 'circle',
		source: 'draw_source',
		paint: {
			'circle-color': ['get', 'color'],
			'circle-opacity': ['get', 'opacity'],
			'circle-radius': 7
		},
		filter: ['==', '$type', 'Point']
	}
];
