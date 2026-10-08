import type { VectorStyle } from '$routes/map/data/types/vector/style';
import type { FeatureCollection } from '$routes/map/types/geojson';

export const withCadTextLabels = (
	style: VectorStyle,
	data: FeatureCollection,
	typeProperty: string,
	textTypes: string[]
): VectorStyle => {
	if (
		style.type !== 'circle'
		|| !data.features.some(feature =>
			(feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint')
			&& textTypes.includes(String(feature.properties?.[typeProperty]))
			&& typeof feature.properties?.text === 'string'
			&& feature.properties.text.trim().length > 0
		)
	) return style;

	return {
		...style,
		labels: {
			...style.labels,
			key: 'text',
			show: true,
			hidePoint: true,
			expressions: [
				...style.labels.expressions.filter(label => label.key !== 'text'),
				{
					key: 'text',
					name: '文字・注記',
					expression: [
						'case',
						['match', ['get', typeProperty], textTypes, true, false],
						['to-string', ['coalesce', ['get', 'text'], '']],
						''
					]
				}
			]
		}
	};
};
