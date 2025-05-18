type EpsgCode =
	| '4326'
	| '3857'
	| '6669'
	| '6670'
	| '6671'
	| '6672'
	| '6673'
	| '6674'
	| '6675'
	| '6676'
	| '6677'
	| '6678'
	| '6679'
	| '6680'
	| '6681'
	| '6682'
	| '6683'
	| '6684'
	| '6685'
	| '6686'
	| '6687';

type Citation =
	| 'WGS 84'
	| 'WGS 84 / Pseudo-Mercator'
	| 'JGD2011 / Japan Plane Rectangular CS I'
	| 'JGD2011 / Japan Plane Rectangular CS II'
	| 'JGD2011 / Japan Plane Rectangular CS III'
	| 'JGD2011 / Japan Plane Rectangular CS IV'
	| 'JGD2011 / Japan Plane Rectangular CS V'
	| 'JGD2011 / Japan Plane Rectangular CS VI'
	| 'JGD2011 / Japan Plane Rectangular CS VII'
	| 'JGD2011 / Japan Plane Rectangular CS VIII'
	| 'JGD2011 / Japan Plane Rectangular CS IX'
	| 'JGD2011 / Japan Plane Rectangular CS X'
	| 'JGD2011 / Japan Plane Rectangular CS XI'
	| 'JGD2011 / Japan Plane Rectangular CS XII'
	| 'JGD2011 / Japan Plane Rectangular CS XIII'
	| 'JGD2011 / Japan Plane Rectangular CS XIV'
	| 'JGD2011 / Japan Plane Rectangular CS XV'
	| 'JGD2011 / Japan Plane Rectangular CS XVI'
	| 'JGD2011 / Japan Plane Rectangular CS XVII'
	| 'JGD2011 / Japan Plane Rectangular CS XVIII'
	| 'JGD2011 / Japan Plane Rectangular CS XIX';

type CitationDict = Record<Citation, EpsgCode>;

export const citationDict: CitationDict = {
	'WGS 84': '4326',
	'WGS 84 / Pseudo-Mercator': '3857',
	'JGD2011 / Japan Plane Rectangular CS I': '6669',
	'JGD2011 / Japan Plane Rectangular CS II': '6670',
	'JGD2011 / Japan Plane Rectangular CS III': '6671',
	'JGD2011 / Japan Plane Rectangular CS IV': '6672',
	'JGD2011 / Japan Plane Rectangular CS V': '6673',
	'JGD2011 / Japan Plane Rectangular CS VI': '6674',
	'JGD2011 / Japan Plane Rectangular CS VII': '6675',
	'JGD2011 / Japan Plane Rectangular CS VIII': '6676',
	'JGD2011 / Japan Plane Rectangular CS IX': '6677',
	'JGD2011 / Japan Plane Rectangular CS X': '6678',
	'JGD2011 / Japan Plane Rectangular CS XI': '6679',
	'JGD2011 / Japan Plane Rectangular CS XII': '6680',
	'JGD2011 / Japan Plane Rectangular CS XIII': '6681',
	'JGD2011 / Japan Plane Rectangular CS XIV': '6682',
	'JGD2011 / Japan Plane Rectangular CS XV': '6683',
	'JGD2011 / Japan Plane Rectangular CS XVI': '6684',
	'JGD2011 / Japan Plane Rectangular CS XVII': '6685',
	'JGD2011 / Japan Plane Rectangular CS XVIII': '6686',
	'JGD2011 / Japan Plane Rectangular CS XIX': '6687'
};

type EpsgDict = {
	[K in EpsgCode]: {
		name: Citation;
		ja: string;
		proj4: string;
	};
};

export const epsgDict: EpsgDict = {
	'4326': {
		name: 'WGS 84',
		ja: '世界測地系',
		proj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs'
	},
	'3857': {
		name: 'WGS 84 / Pseudo-Mercator',
		ja: 'メルカトル図法',
		proj4:
			'+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs'
	},
	'6669': {
		name: 'JGD2011 / Japan Plane Rectangular CS I',
		ja: '日本測地系2011 / 平面直角座標系第1系',
		proj4: ''
	},
	'6670': {
		name: 'JGD2011 / Japan Plane Rectangular CS II',
		ja: '日本測地系2011 / 平面直角座標系第2系',
		proj4: ''
	},
	'6671': {
		name: 'JGD2011 / Japan Plane Rectangular CS III',
		ja: '日本測地系2011 / 平面直角座標系第3系',
		proj4: ''
	},
	'6672': {
		name: 'JGD2011 / Japan Plane Rectangular CS IV',
		ja: '日本測地系2011 / 平面直角座標系第4系',
		proj4: ''
	},
	'6673': {
		name: 'JGD2011 / Japan Plane Rectangular CS V',
		ja: '日本測地系2011 / 平面直角座標系第5系',
		proj4: ''
	},
	'6674': {
		name: 'JGD2011 / Japan Plane Rectangular CS VI',
		ja: '日本測地系2011 / 平面直角座標系第6系',
		proj4: ''
	},
	'6675': {
		name: 'JGD2011 / Japan Plane Rectangular CS VII',
		ja: '日本測地系2011 / 平面直角座標系第7系',
		proj4:
			'+proj=tmerc +lat_0=36 +lon_0=137.166666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
	},
	'6676': {
		name: 'JGD2011 / Japan Plane Rectangular CS VIII',
		ja: '日本測地系2011 / 平面直角座標系第8系',
		proj4: ''
	},
	'6677': {
		name: 'JGD2011 / Japan Plane Rectangular CS IX',
		ja: '日本測地系2011 / 平面直角座標系第9系',
		proj4: ''
	},
	'6678': {
		name: 'JGD2011 / Japan Plane Rectangular CS X',
		ja: '日本測地系2011 / 平面直角座標系第10系',
		proj4: ''
	},
	'6679': {
		name: 'JGD2011 / Japan Plane Rectangular CS XI',
		ja: '日本測地系2011 / 平面直角座標系第11系',
		proj4: ''
	},
	'6680': {
		name: 'JGD2011 / Japan Plane Rectangular CS XII',
		ja: '日本測地系2011 / 平面直角座標系第12系',
		proj4: ''
	},
	'6681': {
		name: 'JGD2011 / Japan Plane Rectangular CS XIII',
		ja: '日本測地系2011 / 平面直角座標系第13系',
		proj4: ''
	},
	'6682': {
		name: 'JGD2011 / Japan Plane Rectangular CS XIV',
		ja: '日本測地系2011 / 平面直角座標系第14系',
		proj4: ''
	},
	'6683': {
		name: 'JGD2011 / Japan Plane Rectangular CS XV',
		ja: '日本測地系2011 / 平面直角座標系第15系',
		proj4: ''
	},
	'6684': {
		name: 'JGD2011 / Japan Plane Rectangular CS XVI',
		ja: '日本測地系2011 / 平面直角座標系第16系',
		proj4: ''
	},
	'6685': {
		name: 'JGD2011 / Japan Plane Rectangular CS XVII',
		ja: '日本測地系2011 / 平面直角座標系第17系',
		proj4: ''
	},
	'6686': {
		name: 'JGD2011 / Japan Plane Rectangular CS XVIII',
		ja: '日本測地系2011 / 平面直角座標系第18系',
		proj4: ''
	},
	'6687': {
		name: 'JGD2011 / Japan Plane Rectangular CS XIX',
		ja: '日本測地系2011 / 平面直角座標系第19系',
		proj4: ''
	}
};
