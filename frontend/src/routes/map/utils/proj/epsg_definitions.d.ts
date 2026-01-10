declare module './epsg_definitions.json' {
	interface EpsgDefinition {
		citation: string;
		proj_context: string;
		wkt: string;
		area_of_use: {
			name: string;
			bounds: [number, number, number, number];
		};
		datum: string;
		ellipsoid: {
			name: string;
			semi_major_axis: number;
			inverse_flattening: number;
		};
		projection_method: string | null;
		name_ja: string;
		prefecture: string;
		zone?: string;
	}

	const epsg_definitions: {
		'4326': EpsgDefinition;
		'3857': EpsgDefinition;
		'4612': EpsgDefinition;
		'6668': EpsgDefinition;
		'6669': EpsgDefinition;
		'6670': EpsgDefinition;
		'6671': EpsgDefinition;
		'6672': EpsgDefinition;
		'6673': EpsgDefinition;
		'6674': EpsgDefinition;
		'6675': EpsgDefinition;
		'6676': EpsgDefinition;
		'6677': EpsgDefinition;
		'6678': EpsgDefinition;
		'6679': EpsgDefinition;
		'6680': EpsgDefinition;
		'6681': EpsgDefinition;
		'6682': EpsgDefinition;
		'6683': EpsgDefinition;
		'6684': EpsgDefinition;
		'6685': EpsgDefinition;
		'6686': EpsgDefinition;
		'6687': EpsgDefinition;
	};
	export default epsg_definitions;
}
