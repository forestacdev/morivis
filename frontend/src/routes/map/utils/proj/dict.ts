import epsg_definitions from './epsg_definitions.json';
export type EpsgCode = keyof typeof epsg_definitions;

export interface EpsgInfo {
	name_ja: string;
	prefecture?: string;
	zone?: string;
	citation: string;
	proj_context: string;
	name: string;
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
	projection_method: string;
}

export interface EpsgInfoWithCode extends EpsgInfo {
	code: EpsgCode;
}

type Options = {
	exclude4326?: boolean;
	exclude3857?: boolean;
};

export const getEpsgInfoArray = (options?: Options): EpsgInfoWithCode[] => {
	return Object.entries(epsg_definitions)
		.filter(([code]) => {
			// デフォルトでは全て含める
			if (!options) return true;

			// trueが指定された場合に除外
			if (options.exclude4326 && code === '4326') {
				return false;
			}
			if (options.exclude3857 && code === '3857') {
				return false;
			}
			return true;
		})
		.map(([code, info]) => ({
			code: code,
			...info
		}));
};

export const getEpsgInfo = (epsgCode: EpsgCode): EpsgInfo => {
	return epsg_definitions[epsgCode];
};

export const getCitation = (epsgCode: EpsgCode): string => {
	return epsg_definitions[epsgCode].citation;
};

export const getProjContext = (epsgCode: EpsgCode): string => {
	return epsg_definitions[epsgCode].proj_context;
};

export const getName = (epsgCode: EpsgCode): string => {
	return epsg_definitions[epsgCode].name_ja;
};

export const getPrefecture = (epsgCode: EpsgCode): string | undefined => {
	return epsg_definitions[epsgCode].prefecture || undefined;
};

export const getZone = (epsgCode: EpsgCode): string | undefined => {
	return epsg_definitions[epsgCode].zone || undefined;
};

export const getBbox = (epsgCode: EpsgCode): [number, number, number, number] => {
	return epsg_definitions[epsgCode].area_of_use.bounds || [0, 0, 0, 0];
};
