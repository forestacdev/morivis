import epsg_definitions from './epsg_definitions.json';
import {
	getJapanPlaneRectangularEpsg,
	getJapanPlaneRectangularProj4,
	getJapanPlaneRectangularSystems,
	type JapanPlaneRectangularInfo
} from './japan-plane-rectangular';
import { TOKYO_NADGRID_PROJ4_VALUE } from './nadgrid';

const TOKYO_JAPAN_PLANE_RECTANGULAR_CODES = [
	'30161',
	'30162',
	'30163',
	'30164',
	'30165',
	'30166',
	'30167',
	'30168',
	'30169',
	'30170',
	'30171',
	'30172',
	'30173',
	'30174',
	'30175',
	'30176',
	'30177',
	'30178',
	'30179'
] as const;

const JGD2000_JAPAN_PLANE_RECTANGULAR_CODES = [
	'2443',
	'2444',
	'2445',
	'2446',
	'2447',
	'2448',
	'2449',
	'2450',
	'2451',
	'2452',
	'2453',
	'2454',
	'2455',
	'2456',
	'2457',
	'2458',
	'2459',
	'2460',
	'2461'
] as const;

type StaticEpsgCode = keyof typeof epsg_definitions;

export type EpsgCode =
	| StaticEpsgCode
	| '4301'
	| (typeof JGD2000_JAPAN_PLANE_RECTANGULAR_CODES)[number]
	| (typeof TOKYO_JAPAN_PLANE_RECTANGULAR_CODES)[number];

export interface EpsgInfo {
	name_ja: string;
	prefecture: string;
	zone?: string;
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
}

export interface EpsgInfoWithCode extends EpsgInfo {
	code: EpsgCode;
}

const TOKYO_DATUM_TOWGS84 = '-146.414,507.337,680.507,0,0,0,0';

const TOKYO_GEOGRAPHIC_WKT =
	'GEOGCS["Tokyo",DATUM["Tokyo",SPHEROID["Bessel 1841",6377397.155,299.1528128,AUTHORITY["EPSG","7004"]],TOWGS84[-146.414,507.337,680.507,0,0,0,0],AUTHORITY["EPSG","6301"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4301"]]';

const createTokyoPlaneRectangularWkt = (
	epsgCode: string,
	info: JapanPlaneRectangularInfo
): string => {
	return `PROJCS["Tokyo / Japan Plane Rectangular CS ${info.roman}",GEOGCS["Tokyo",DATUM["Tokyo",SPHEROID["Bessel 1841",6377397.155,299.1528128,AUTHORITY["EPSG","7004"]],TOWGS84[-146.414,507.337,680.507,0,0,0,0],AUTHORITY["EPSG","6301"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4301"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",${info.originLatitude}],PARAMETER["central_meridian",${info.originLongitude}],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AUTHORITY["EPSG","${epsgCode}"]]`;
};

const createJgd2000PlaneRectangularWkt = (
	epsgCode: string,
	info: JapanPlaneRectangularInfo
): string => {
	return `PROJCS["JGD2000 / Japan Plane Rectangular CS ${info.roman}",GEOGCS["JGD2000",DATUM["Japanese_Geodetic_Datum_2000",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","6612"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4612"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",${info.originLatitude}],PARAMETER["central_meridian",${info.originLongitude}],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AUTHORITY["EPSG","${epsgCode}"]]`;
};

const createJgd2000PlaneRectangularDefinitions = (): Record<
	(typeof JGD2000_JAPAN_PLANE_RECTANGULAR_CODES)[number],
	EpsgInfo
> => {
	const definitions = {} as Record<
		(typeof JGD2000_JAPAN_PLANE_RECTANGULAR_CODES)[number],
		EpsgInfo
	>;

	for (const info of getJapanPlaneRectangularSystems()) {
		const jgd2000Code = info.epsg.jgd2000.replace(
			'EPSG:',
			''
		) as (typeof JGD2000_JAPAN_PLANE_RECTANGULAR_CODES)[number];
		const jgd2011Code = info.epsg.jgd2011.replace('EPSG:', '') as StaticEpsgCode;
		const baseDefinition = epsg_definitions[jgd2011Code] as EpsgInfo;
		const jgd2000Proj = getJapanPlaneRectangularProj4(info.zone, 'jgd2000');

		if (!jgd2000Proj) continue;

		definitions[jgd2000Code] = {
			...baseDefinition,
			citation: `JGD2000 / Japan Plane Rectangular CS ${info.roman}`,
			proj_context: jgd2000Proj,
			wkt: createJgd2000PlaneRectangularWkt(jgd2000Code, info),
			datum: 'Japanese Geodetic Datum 2000',
			name_ja: `日本測地系2000 / 平面直角座標系第${info.zone}系`
		};
	}

	return definitions;
};

const createTokyoDefinitions = ():
	& Record<'4301', EpsgInfo>
	& Record<(typeof TOKYO_JAPAN_PLANE_RECTANGULAR_CODES)[number], EpsgInfo> =>
{
	const baseGeographicDefinition = epsg_definitions['4612'] as EpsgInfo;
	const definitions = {
		'4301': {
			...baseGeographicDefinition,
			citation: 'Tokyo',
			proj_context:
				`+proj=longlat +ellps=bessel ${TOKYO_NADGRID_PROJ4_VALUE} +no_defs +type=crs`,
			wkt: TOKYO_GEOGRAPHIC_WKT,
			datum: 'Tokyo',
			ellipsoid: {
				name: 'Bessel 1841',
				semi_major_axis: 6377397.155,
				inverse_flattening: 299.1528128
			},
			name_ja: '旧日本測地系 / 地理座標系'
		}
	} as
		& Record<'4301', EpsgInfo>
		& Record<(typeof TOKYO_JAPAN_PLANE_RECTANGULAR_CODES)[number], EpsgInfo>;

	for (const info of getJapanPlaneRectangularSystems()) {
		const tokyoCode = getJapanPlaneRectangularEpsg(info.zone, 'tokyo')?.replace(
			/^EPSG:/i,
			''
		) as (typeof TOKYO_JAPAN_PLANE_RECTANGULAR_CODES)[number] | undefined;
		const jgd2011Code = info.epsg.jgd2011.replace('EPSG:', '') as StaticEpsgCode;
		const baseDefinition = epsg_definitions[jgd2011Code] as EpsgInfo;
		const tokyoProj = getJapanPlaneRectangularProj4(info.zone, 'tokyo');

		if (!tokyoCode || !tokyoProj) continue;

		definitions[tokyoCode] = {
			...baseDefinition,
			citation: `Tokyo / Japan Plane Rectangular CS ${info.roman}`,
			proj_context: tokyoProj,
			wkt: createTokyoPlaneRectangularWkt(tokyoCode, info),
			datum: 'Tokyo',
			ellipsoid: {
				name: 'Bessel 1841',
				semi_major_axis: 6377397.155,
				inverse_flattening: 299.1528128
			},
			name_ja: `旧日本測地系 / 平面直角座標系第${info.zone}系`
		};
	}

	return definitions;
};

const EPSG_INFO_MAP: Record<EpsgCode, EpsgInfo> = {
	...(epsg_definitions as Record<StaticEpsgCode, EpsgInfo>),
	...createJgd2000PlaneRectangularDefinitions(),
	...createTokyoDefinitions()
};

const getEpsgSortPriority = (code: EpsgCode): number => {
	if (code === '4326') return 0;
	if (code === '3857') return 1;
	if (code === '4301') return 2;
	if (code === '4612') return 3;
	if (code === '6668') return 4;

	const numericCode = Number(code);

	if (numericCode >= 6669 && numericCode <= 6687) {
		return 100 + (numericCode - 6669);
	}

	if (numericCode >= 2443 && numericCode <= 2461) {
		return 200 + (numericCode - 2443);
	}

	if (numericCode >= 30161 && numericCode <= 30179) {
		return 300 + (numericCode - 30161);
	}

	return 1000 + numericCode;
};

export const isValidEpsg = (code: string): code is EpsgCode => {
	return code in EPSG_INFO_MAP;
};

type Options = {
	exclude4326?: boolean;
	exclude3857?: boolean;
};

export const getEpsgInfoArray = (options?: Options): EpsgInfoWithCode[] => {
	return Object.entries(EPSG_INFO_MAP)
		.sort(
			([codeA], [codeB]) =>
				getEpsgSortPriority(codeA as EpsgCode) - getEpsgSortPriority(codeB as EpsgCode)
		)
		.filter(([code]) => {
			if (!options) return true;
			if (options.exclude4326 && code === '4326') {
				return false;
			}
			if (options.exclude3857 && code === '3857') {
				return false;
			}
			return true;
		})
		.map(([code, info]) => ({
			code: code as EpsgCode,
			...(info as EpsgInfo)
		}));
};

export const getEpsgInfo = (epsgCode: EpsgCode): EpsgInfo => {
	return EPSG_INFO_MAP[epsgCode];
};

export const getCitation = (epsgCode: EpsgCode): string => {
	return EPSG_INFO_MAP[epsgCode].citation;
};

export const getProjContext = (epsgCode: EpsgCode): string => {
	return EPSG_INFO_MAP[epsgCode].proj_context;
};

export const getName = (epsgCode: EpsgCode): string => {
	return EPSG_INFO_MAP[epsgCode].name_ja;
};

export const getPrefecture = (epsgCode: EpsgCode): string | undefined => {
	return EPSG_INFO_MAP[epsgCode].prefecture || undefined;
};

export const getZone = (epsgCode: EpsgCode): string | undefined => {
	return EPSG_INFO_MAP[epsgCode].zone || undefined;
};

export const getBbox = (epsgCode: EpsgCode): [number, number, number, number] => {
	return EPSG_INFO_MAP[epsgCode].area_of_use.bounds;
};

export const getWkt = (epsgCode: EpsgCode): string => {
	return EPSG_INFO_MAP[epsgCode].wkt;
};
