import { getProjContext } from './dict';

const WEB_MERCATOR_KEYWORDS = [
	'EPSG:3857',
	'WGS 84 / PSEUDO-MERCATOR',
	'WGS_1984_WEB_MERCATOR_AUXILIARY_SPHERE',
	'WEB_MERCATOR_AUXILIARY_SPHERE',
	'POPULAR_VISUALISATION_PSEUDO_MERCATOR',
	'PSEUDO-MERCATOR',
	'SPHERICAL_MERCATOR',
	'GOOGLE MERCATOR',
	'900913',
	'102100',
	'102113',
	'+PROJ=MERC'
];

export const isWebMercatorPrj = (prjContent: string): boolean => {
	if (!prjContent) {
		return false;
	}

	const prjContentUpper = prjContent.toUpperCase();
	return WEB_MERCATOR_KEYWORDS.some((keyword) => prjContentUpper.includes(keyword));
};

export const normalizePrjContent = (prjContent: string): string => {
	if (isWebMercatorPrj(prjContent)) {
		return getProjContext('3857');
	}

	return prjContent.trim();
};

export const isWgs84Prj = (prjContent: string): boolean => {
	if (!prjContent) {
		return false;
	}

	const prjContentUpper = prjContent.toUpperCase();

	if (
		prjContentUpper.includes('GCS_WGS_1984')
		&& prjContentUpper.includes('D_WGS_1984')
		&& prjContentUpper.includes('WGS_1984')
		&& prjContentUpper.includes('PRIMEM["GREENWICH"')
		&& prjContentUpper.includes('UNIT["DEGREE"')
	) {
		return true;
	}

	if (prjContentUpper.includes('+PROJ=LONGLAT') && prjContentUpper.includes('+DATUM=WGS84')) {
		return true;
	}

	return false;
};

// TODO
export const isWgs84Crs = (crs: any): boolean => {
	if (!crs) {
		return false;
	}

	if (crs.type === 'name' && crs.properties && crs.properties.name) {
		const name = crs.properties.name;
		if (name === 'urn:ogc:def:crs:EPSG::4326' || name === 'EPSG:4326') {
			return true;
		}
	} else if (crs.type === 'proj4') {
		const proj4Definition = crs.proj4;
		if (proj4Definition.includes('+proj=longlat') && proj4Definition.includes('+datum=WGS84')) {
			return true;
		}
	} else if (crs.type === 'wkt') {
		const wktDefinition = crs.wkt;
		if (wktDefinition.includes('GCS_WGS_1984') && wktDefinition.includes('D_WGS_1984')) {
			return true;
		}
	}

	return false;
};
