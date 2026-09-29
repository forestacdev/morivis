import { requireTab, TabReader } from './binary';
import { spheroids } from './spheroids';

export const readMapHeader = (map: Uint8Array) => {
	const r = new TabReader(map);
	r.range(0, 512);
	r.seek(0x100);
	requireTab(r.u32() === 42424242, 'MAPの識別子が不正です');
	const version = r.u16(), blockSize = r.u16();
	requireTab(version >= 100 && version <= 900, `未対応のMAPバージョンです (${version})`);
	requireTab(
		blockSize >= 512 && blockSize <= 32768 && blockSize % 512 === 0,
		'MAPブロック長が不正です'
	);
	const quadrant = map[0x161];
	requireTab(quadrant <= 4, '座標の象限が不正です');
	r.seek(0x16a);
	const datum = r.u16();
	r.skip(1);
	const projection = r.u8(), ellipsoid = r.u8(), units = r.u8();
	let xs = r.f64(), ys = r.f64(), xd = r.f64(), yd = r.f64();
	if (version <= 100) {
		xs = ys = 10 ** map[0x160];
		xd = yd = 0;
	}
	requireTab(xs > 0 && ys > 0, '座標スケールが不正です');
	const precision = [xs, ys].map(v => 10 ** Math.round(Math.log10(v)));
	const params = Array.from({ length: 6 }, () => r.f64());
	const shifts = Array.from({ length: 3 }, () => r.f64());
	const datumParams = Array.from({ length: 5 }, () => version > 200 ? r.f64() : (r.skip(8), 0));
	// アフィン付きCRSは単純な投影式へ読み替えず、元座標で選択UIへ渡す。
	const affine = version >= 500 && map.length >= 1024 && map[512] !== 0;
	if (projection === 35 && version >= 500) {
		r.seek(0x268);
		params.push(r.f64());
	}
	const point = (x: number, y: number): [number, number] => {
		const raw = [
			[0, 2, 3].includes(quadrant) ? -(x + xd) / xs : (x - xd) / xs,
			[0, 3, 4].includes(quadrant) ? -(y + yd) / ys : (y - yd) / ys
		];
		return raw.map((v, i) => {
			const scaled = v * precision[i];
			return Math.sign(scaled) * Math.floor(Math.abs(scaled) + 0.5) / precision[i];
		}) as [number, number];
	};
	return {
		version,
		blockSize,
		quadrant,
		datum,
		projection,
		ellipsoid,
		units,
		params,
		shifts,
		datumParams,
		affine,
		point,
		xs,
		ys
	};
};
export type MapHeader = ReturnType<typeof readMapHeader>;

/** MAP内の投影定義をproj4へ。変換不能な定義は推測せずundefinedを返す。 */
export const mapProjection = (h: MapHeader): string | undefined => {
	if (!h.projection || h.affine) return;
	if (h.projection === 10 && h.datum === 157 && h.ellipsoid === 54) return 'EPSG:3857';
	const spheroid = spheroids[h.ellipsoid];
	if (!spheroid) return;
	const [a, rf] = spheroid, p = h.params;
	const units: Record<number, number> = {
		0: 1609.344,
		1: 1000,
		2: 0.0254,
		3: 0.3048,
		4: 0.9144,
		5: 0.001,
		6: 0.01,
		7: 1,
		8: 1200 / 3937,
		9: 1852,
		30: 0.201168,
		31: 20.1168,
		32: 5.0292
	};
	const unit = units[h.units];
	if (h.projection !== 1 && !unit) return;
	const lon = `+lon_0=${p[0]}`, origin = `${lon} +lat_0=${p[1]}`;
	const offset = (i: number) => `+x_0=${p[i] * unit} +y_0=${p[i + 1] * unit}`;
	let projection: string;
	switch (h.projection) {
		case 1:
			projection = '+proj=longlat';
			break;
		case 2:
			projection = `+proj=cea ${lon} +lat_ts=${p[1]} ${offset(2)}`;
			break;
		case 3:
		case 6:
		case 9:
			projection = `+proj=${
				h.projection === 3 ? 'lcc' : h.projection === 6 ? 'eqdc' : 'aea'
			} ${origin} +lat_1=${p[2]} +lat_2=${p[3]} ${offset(4)}`;
			break;
		case 4:
		case 29:
			projection = `+proj=laea ${origin}`;
			break;
		case 5:
		case 28:
			projection = `+proj=aeqd ${origin}`;
			break;
		case 7:
			projection = `+proj=omerc +lonc=${p[0]} +lat_0=${p[1]} +alpha=${p[2]} +gamma=${90} +k=${
				p[3]
			} ${offset(4)}`;
			break;
		case 35:
			projection = `+proj=omerc +lonc=${p[0]} +lat_0=${p[1]} +alpha=${p[2]} +gamma=${
				p[3]
			} +k=${p[4]} ${offset(5)}`;
			break;
		case 8:
		case 21:
		case 22:
		case 23:
		case 24:
		case 34:
			projection = `+proj=tmerc ${origin} +k=${p[2]} ${offset(3)}`;
			break;
		case 10:
			projection = `+proj=merc ${lon}`;
			break;
		case 11:
			projection = `+proj=mill ${lon}`;
			break;
		case 12:
			projection = `+proj=robin ${lon}`;
			break;
		case 13:
			projection = `+proj=moll ${lon}`;
			break;
		case 14:
			projection = `+proj=eck4 ${lon}`;
			break;
		case 15:
			projection = `+proj=eck6 ${lon}`;
			break;
		case 16:
			projection = `+proj=sinu ${lon}`;
			break;
		case 17:
			projection = `+proj=gall ${lon}`;
			break;
		case 18:
			projection = `+proj=nzmg ${origin} ${offset(2)}`;
			break;
		case 20:
			projection = `+proj=stere ${origin} +k=${p[2]} ${offset(3)}`;
			break;
		case 25:
			projection = `+proj=somerc ${origin} ${offset(2)}`;
			break;
		case 26:
			projection = `+proj=merc ${lon} +lat_ts=${p[1]}`;
			break;
		case 27:
			projection = `+proj=poly ${origin} ${offset(2)}`;
			break;
		case 30:
			projection = `+proj=cass ${origin} ${offset(2)}`;
			break;
		case 31:
			projection = `+proj=sterea ${origin} +k=${p[2]} ${offset(3)}`;
			break;
		case 33:
			projection = `+proj=eqc ${origin} ${offset(2)}`;
			break;
		default:
			return;
	}
	const d = h.datumParams;
	const towgs84 = [...h.shifts, -d[0], -d[1], -d[2], d[3]].join(',');
	return `${projection} +a=${a} ${rf ? `+rf=${rf}` : `+b=${a}`} +towgs84=${towgs84} +pm=${d[4]} ${
		h.projection === 1 ? '' : `+to_meter=${unit}`
	} +no_defs`;
};
