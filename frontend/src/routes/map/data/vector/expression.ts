type MatchCategories = string[] | number[];

interface MappingMatchColor {
	categories: MatchCategories;
	values?: string[];
	showIndex?: number[];
}

interface MappingInterpolateColor {
	min: number;
	max: number;
	divisions: number;
	values?: string[];
	showIndex?: number[];
}

interface MappingMatchNumber {
	categories: MatchCategories;
	values?: number[];
	showIndex?: number[];
}

interface MappingInterpolateNumber {
	min: number;
	max: number;
	divisions: number;
	values?: number[];
	showIndex?: number[];
}

export interface ExpressionColor {
	type: 'match' | 'step' | 'interpolate';
	key: string;
	name: string;
	mapping: MappingInterpolateColor | MappingMatchColor;
}

export interface ExpressionNumber {
	type: 'match' | 'step' | 'interpolate';
	key: string;
	name: string;
	mapping: MappingInterpolateNumber | MappingMatchNumber;
}

export interface Expressions {
	color: ExpressionColor[];
	number: ExpressionNumber[];
}
