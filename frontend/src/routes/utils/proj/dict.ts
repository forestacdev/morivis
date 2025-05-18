type EpsgCode = '4326' | '3857' | '6675' | '6669' | '6670' | '6671' | '4326';

type Citation =
	| 'WGS 84'
	| 'WGS 84 / Pseudo-Mercator'
	| 'JGD2011 / Japan Plane Rectangular CS VII'
	| 'JGD2011 / Japan Plane Rectangular CS I'
	| 'JGD2011 / Japan Plane Rectangular CS II'
	| 'JGD2011 / Japan Plane Rectangular CS III';

type CitationDict = Record<Citation, EpsgCode>;

export const citationDict: CitationDict = {
	'WGS 84': '4326',
	'WGS 84 / Pseudo-Mercator': '3857',
	'JGD2011 / Japan Plane Rectangular CS VII': '6675',
	'JGD2011 / Japan Plane Rectangular CS I': '6669',
	'JGD2011 / Japan Plane Rectangular CS II': '6670',
	'JGD2011 / Japan Plane Rectangular CS III': '6671'
};

type EpsgDict = {
	[K in EpsgCode]: {
		name: Citation;
		proj4: string;
	};
};

export const epsgDict: EpsgDict = {
	'4326': {
		name: 'WGS 84',
		proj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs'
	},
	'3857': {
		name: 'WGS 84 / Pseudo-Mercator',
		proj4:
			'+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs'
	},
	'6675': {
		name: 'JGD2011 / Japan Plane Rectangular CS VII',
		proj4:
			'+proj=tmerc +lat_0=36 +lon_0=137.166666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
	}
};
