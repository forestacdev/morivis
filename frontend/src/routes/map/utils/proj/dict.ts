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

export const proj4Dict: Record<EpsgCode, string> = {
	'4326': '+proj=longlat +datum=WGS84 +no_defs +type=crs',
	'3857':
		'+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs',
	'6669':
		'+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6670':
		'+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6671':
		'+proj=tmerc +lat_0=36 +lon_0=132.166666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6672':
		'+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6673':
		'+proj=tmerc +lat_0=36 +lon_0=134.333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6674':
		'+proj=tmerc +lat_0=36 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6675':
		'+proj=tmerc +lat_0=36 +lon_0=137.166666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6676':
		'+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6677':
		'+proj=tmerc +lat_0=36 +lon_0=139.833333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6678':
		'+proj=tmerc +lat_0=40 +lon_0=140.833333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6679':
		'+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6680':
		'+proj=tmerc +lat_0=44 +lon_0=142.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6681':
		'+proj=tmerc +lat_0=44 +lon_0=144.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6682':
		'+proj=tmerc +lat_0=26 +lon_0=142 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6683':
		'+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6684':
		'+proj=tmerc +lat_0=26 +lon_0=124 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6685':
		'+proj=tmerc +lat_0=26 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6686':
		'+proj=tmerc +lat_0=20 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6687':
		'+proj=tmerc +lat_0=26 +lon_0=154 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs'
};

type EpsgNameDict = Record<EpsgCode, string>;

export const epsgNameDict: EpsgNameDict = {
	'4326': '世界測地系',
	'3857': 'メルカトル図法',
	'6669': '日本測地系2011 / 平面直角座標系第1系',
	'6670': '日本測地系2011 / 平面直角座標系第2系',
	'6671': '日本測地系2011 / 平面直角座標系第3系',
	'6672': '日本測地系2011 / 平面直角座標系第4系',
	'6673': '日本測地系2011 / 平面直角座標系第5系',
	'6674': '日本測地系2011 / 平面直角座標系第6系',
	'6675': '日本測地系2011 / 平面直角座標系第7系',
	'6676': '日本測地系2011 / 平面直角座標系第8系',
	'6677': '日本測地系2011 / 平面直角座標系第9系',
	'6678': '日本測地系2011 / 平面直角座標系第10系',
	'6679': '日本測地系2011 / 平面直角座標系第11系',
	'6680': '日本測地系2011 / 平面直角座標系第12系',
	'6681': '日本測地系2011 / 平面直角座標系第13系',
	'6682': '日本測地系2011 / 平面直角座標系第14系',
	'6683': '日本測地系2011 / 平面直角座標系第15系',
	'6684': '日本測地系2011 / 平面直角座標系第16系',
	'6685': '日本測地系2011 / 平面直角座標系第17系',
	'6686': '日本測地系2011 / 平面直角座標系第18系',
	'6687': '日本測地系2011 / 平面直角座標系第19系'
};
