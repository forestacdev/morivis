import type { FeatureCollection } from '$routes/map/types/geojson';
import {
	degreesLat,
	degreesLong,
	eciToGeodetic,
	gstime,
	json2satrec,
	type OMMJsonObject,
	propagate,
	type SatRec,
	twoline2satrec
} from 'satellite.js';
import { formatOrbit, orbitLimits } from './definition';
import { isOmmObject } from './files';
import type { OrbitOptions, OrbitResult, OrbitSatellite, OrbitSummary } from './types';

type OrbitRecord = OrbitSatellite & { satrec: SatRec; };
const dayMs = 86400000;
const number = (value: unknown, key: string): number => {
	if (
		(typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === ''
		|| !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(String(value).trim())
		|| !Number.isFinite(Number(value))
	) {
		throw new Error(`軌道要素 ${key} に有効な数値が必要です`);
	}
	return Number(value);
};
const inRange = (value: number, min: number, max: number, key: string, exclusive = false) => {
	if (value < min || (exclusive ? value >= max : value > max)) {
		throw new Error(`軌道要素 ${key} が範囲外です`);
	}
	return value;
};

/** 日付の自動繰り上げやローカル時刻解釈を避ける。OMMの無印時刻はUTC。 */
export const orbitUtcTime = (raw: unknown): number => {
	if (typeof raw !== 'string') throw new Error('時刻をUTCで指定してください');
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z?$/.exec(raw);
	if (!match) throw new Error('時刻をUTCの年月日時分秒で指定してください');
	const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
	const date = new Date(0);
	date.setUTCFullYear(year, month - 1, day);
	date.setUTCHours(hour, minute, second, Number((match[7] ?? '').padEnd(3, '0').slice(0, 3)));
	if (
		date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1
		|| date.getUTCDate() !== day
		|| date.getUTCHours() !== hour || date.getUTCMinutes() !== minute
		|| date.getUTCSeconds() !== second
	) {
		throw new Error('存在しない日時が指定されています');
	}
	return date.getTime();
};

const validateElements = (rec: SatRec) => {
	if (
		![
			rec.jdsatepoch,
			rec.no,
			rec.ecco,
			rec.inclo,
			rec.nodeo,
			rec.argpo,
			rec.mo,
			rec.bstar,
			rec.ndot,
			rec.nddot
		].every(Number.isFinite)
		|| rec.no <= 0 || rec.error
	) throw new Error('軌道要素から有効な軌道を計算できません');
	inRange(rec.ecco, 0, 1, 'ECCENTRICITY', true);
	inRange(rec.inclo, 0, Math.PI, 'INCLINATION');
};

const checkTleLine = (line: string, index: number) => {
	if (
		line.length !== 69 || line[0] !== String(index) || line[1] !== ' ' || !/^\d$/.test(line[68])
	) {
		throw new Error(`TLEの第${index}行はチェックサムを含む69文字で指定してください`);
	}
	const sum = [...line.slice(0, 68)].reduce(
		(value, char) => value + (/\d/.test(char) ? Number(char) : char === '-' ? 1 : 0),
		0
	);
	if (sum % 10 !== Number(line[68])) {
		throw new Error(`TLEの第${index}行のチェックサムが一致しません`);
	}
};

const parseTle = (text: string): OrbitRecord[] => {
	const lines = text.split(/\r?\n/).map(line => line.trimEnd()).filter(line => line.trim());
	const records: OrbitRecord[] = [];
	for (let i = 0; i < lines.length;) {
		let name = '';
		if (!lines[i].startsWith('1 ')) name = lines[i++].replace(/^0 /, '').trim();
		const first = lines[i++], second = lines[i++];
		if (!first || !second) throw new Error('TLEの第1行と第2行を揃えてください');
		checkTleLine(first, 1);
		checkTleLine(second, 2);
		const id = first.slice(2, 7);
		if (!/^[A-HJ-NP-Z\d]\d{4}$/.test(id) || second.slice(2, 7) !== id) {
			throw new Error('TLEの衛星番号が一致しません');
		}
		if (!/^[ 0]$/.test(first[62])) {
			throw new Error('SGP4用のTLE（ephemeris type 0）に対応しています');
		}
		const year2 = number(first.slice(18, 20), 'epoch year');
		const year = year2 < 57 ? 2000 + year2 : 1900 + year2;
		const days = number(first.slice(20, 32), 'epoch day');
		const start = Date.UTC(year, 0, 1);
		inRange(days, 1, (Date.UTC(year + 1, 0, 1) - start) / dayMs + 1, 'epoch day', true);
		number(first.slice(33, 43), 'MEAN_MOTION_DOT');
		for (const field of [first.slice(44, 52), first.slice(53, 61)]) {
			if (!/^[ +-]\d{5}[+-]\d$/.test(field)) throw new Error('TLEの指数表記が不正です');
		}
		inRange(number(second.slice(8, 16), 'INCLINATION'), 0, 180, 'INCLINATION');
		for (const [a, b] of [[17, 25], [34, 42], [43, 51]]) {
			inRange(number(second.slice(a, b), 'angle'), 0, 360, 'angle', true);
		}
		if (!/^\d{7}$/.test(second.slice(26, 33))) throw new Error('TLEの離心率が不正です');
		if (number(second.slice(52, 63), 'MEAN_MOTION') <= 0) {
			throw new Error('平均運動は0より大きい値が必要です');
		}
		const satrec = twoline2satrec(first, second);
		validateElements(satrec);
		records.push({
			id,
			name: name || id,
			epoch: new Date(start + Math.round((days - 1) * dayMs)).toISOString(),
			format: 'TLE',
			satrec
		});
		if (records.length > formatOrbit.limits.maxFeatures) {
			throw new Error('衛星数は1000機以下に分割してください');
		}
	}
	return records;
};

const parseOmm = (text: string): OrbitRecord[] => {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('OMMのJSONを読み取れませんでした');
	}
	const values = Array.isArray(data) ? data : [data];
	if (values.length > formatOrbit.limits.maxFeatures) {
		throw new Error('衛星数は1000機以下に分割してください');
	}
	return values.map(value => {
		if (!isOmmObject(value)) throw new Error('OMM JSONの軌道要素が見つかりません');
		for (
			const [key, expected] of Object.entries({
				CENTER_NAME: 'EARTH',
				REF_FRAME: 'TEME',
				TIME_SYSTEM: 'UTC',
				MEAN_ELEMENT_THEORY: 'SGP4'
			})
		) {
			if (value[key] !== undefined && value[key] !== expected) {
				throw new Error(`OMMの${key}は${expected}に対応しています`);
			}
		}
		if (value.CCSDS_OMM_VERS !== undefined && !/^3\.\d+$/.test(String(value.CCSDS_OMM_VERS))) {
			throw new Error('OMM JSONはバージョン3に対応しています');
		}
		if (
			value.EPHEMERIS_TYPE !== undefined
			&& number(value.EPHEMERIS_TYPE, 'EPHEMERIS_TYPE') !== 0
		) throw new Error('OMMのEPHEMERIS_TYPEは0に対応しています');
		const epoch = new Date(orbitUtcTime(value.EPOCH)).toISOString();
		const id = number(value.NORAD_CAT_ID, 'NORAD_CAT_ID');
		if (!Number.isSafeInteger(id) || id <= 0) {
			throw new Error('OMMの衛星番号は正の整数で指定してください');
		}
		const normalized: Record<string, unknown> = { ...value, EPOCH: epoch };
		for (
			const key of [
				'MEAN_MOTION',
				'ECCENTRICITY',
				'INCLINATION',
				'RA_OF_ASC_NODE',
				'ARG_OF_PERICENTER',
				'MEAN_ANOMALY',
				'BSTAR',
				'MEAN_MOTION_DOT',
				'MEAN_MOTION_DDOT'
			]
		) normalized[key] = number(value[key], key);
		inRange(Number(normalized.ECCENTRICITY), 0, 1, 'ECCENTRICITY', true);
		inRange(Number(normalized.INCLINATION), 0, 180, 'INCLINATION');
		for (const key of ['RA_OF_ASC_NODE', 'ARG_OF_PERICENTER', 'MEAN_ANOMALY']) {
			inRange(Number(normalized[key]), 0, 360, key, true);
		}
		if (Number(normalized.MEAN_MOTION) <= 0) {
			throw new Error('平均運動は0より大きい値が必要です');
		}
		const satrec = json2satrec(normalized as OMMJsonObject);
		validateElements(satrec);
		return {
			id: String(id),
			name: typeof value.OBJECT_NAME === 'string' && value.OBJECT_NAME.trim()
				? value.OBJECT_NAME.trim()
				: String(id),
			epoch,
			format: 'OMM',
			satrec
		};
	});
};

const parseRecords = (text: string) => {
	if (text.length > formatOrbit.limits.maxTextLength) {
		throw new Error('TLE / OMMは8 MiB以下に分割してください');
	}
	const clean = text.replace(/^\uFEFF/, '').trim();
	if (clean.startsWith('<') || /^CCSDS_OMM_VERS\s*=/.test(clean)) {
		throw new Error('OMMはJSON形式で読み込んでください。XML・KVNには未対応です');
	}
	const records = clean.startsWith('[') || clean.startsWith('{')
		? parseOmm(clean)
		: parseTle(clean);
	if (!records.length) throw new Error('衛星の軌道要素がありません');
	const ids = new Set<string>();
	for (const record of records) {
		if (ids.has(record.id)) {
			throw new Error(
				`衛星番号${record.id}が重複しています。1機につき1組の軌道要素にしてください`
			);
		}
		ids.add(record.id);
	}
	return records;
};

export const inspectOrbit = (text: string): OrbitSummary => {
	const satellites = parseRecords(text).map(({ satrec: _, ...satellite }) => satellite);
	const start = Math.max(...satellites.map(satellite => Date.parse(satellite.epoch)));
	return {
		satellites,
		defaultOptions: {
			start: new Date(start).toISOString(),
			end: new Date(start + 7200000).toISOString(),
			stepSeconds: 60
		}
	};
};

export const propagateOrbit = (text: string, options: OrbitOptions): OrbitResult => {
	const records = parseRecords(text);
	const start = orbitUtcTime(options.start),
		end = orbitUtcTime(options.end),
		step = options.stepSeconds * 1000;
	if (end <= start) throw new Error('終了時刻は開始時刻より後にしてください');
	if (end - start > orbitLimits.maxDurationSeconds * 1000) {
		throw new Error('計算期間は7日以内にしてください');
	}
	if (
		!Number.isInteger(options.stepSeconds) || options.stepSeconds < orbitLimits.minStepSeconds
		|| options.stepSeconds > orbitLimits.maxStepSeconds
	) throw new Error('計算間隔は1〜86400秒の整数で指定してください');
	const count = Math.ceil((end - start) / step) + 1;
	if (count * records.length > formatOrbit.limits.maxSamples) {
		throw new Error(
			'衛星数と時刻数の組み合わせが20万点を超えます。期間を短くするか計算間隔を広げてください'
		);
	}
	const dates = Array.from(
		{ length: count },
		(_, i) => new Date(Math.min(start + step * i, end))
	);
	const empty = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] });
	const result: OrbitResult = {
		points: empty(),
		tracks: empty(),
		timestamps: dates.map(date => date.toISOString()),
		warnings: []
	};
	for (const record of records) {
		if (
			Math.max(
				Math.abs(start - Date.parse(record.epoch)),
				Math.abs(end - Date.parse(record.epoch))
			) > 14 * dayMs
		) {
			result.warnings.push(
				`${record.name}: 軌道要素の基準時刻から14日以上離れています。予測誤差が大きくなる場合があります。`
			);
		}
		let track: [number, number][] = [], trackStart = '', trackEnd = '', segment = 0;
		const properties = {
			satellite_id: record.id,
			name: record.name,
			epoch: record.epoch,
			source_format: record.format
		};
		const finish = () => {
			if (track.length > 1) {
				result.tracks.features.push({
					type: 'Feature',
					geometry: { type: 'LineString', coordinates: track },
					properties: {
						...properties,
						start_time: trackStart,
						end_time: trackEnd,
						segment: segment++,
						point_count: track.length
					}
				});
			}
			track = [];
		};
		for (const date of dates) {
			const state = propagate(record.satrec, date);
			if (!state || record.satrec.error) {
				throw new Error(
					`${record.name} の ${date.toISOString()} の軌道を計算できません（SGP4エラー ${record.satrec.error}）`
				);
			}
			const geo = eciToGeodetic(state.position, gstime(date));
			const xy: [number, number] = [degreesLong(geo.longitude), degreesLat(geo.latitude)];
			const height = geo.height * 1000;
			if (![...xy, height].every(Number.isFinite)) {
				throw new Error(`${record.name} の座標が不正です`);
			}
			result.points.features.push({
				type: 'Feature',
				geometry: { type: 'Point', coordinates: xy },
				properties: { ...properties, time: date.toISOString(), height }
			});
			// 日付変更線を横断する線を地図の中央へ引かない。
			if (track.length && Math.abs(track.at(-1)![0] - xy[0]) > 180) finish();
			if (!track.length) trackStart = date.toISOString();
			trackEnd = date.toISOString();
			track.push(xy);
		}
		finish();
	}
	return result;
};
