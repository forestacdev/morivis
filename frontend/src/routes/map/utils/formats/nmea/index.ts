import { parseNmeaSentence } from 'nmea-simple';
import { parseLatitude, parseLongitude } from 'nmea-simple/dist/helpers';

import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { PointGeometry } from '$routes/map/types/geometry';
import { formatNmea } from './definition';

export interface NmeaResult {
	tracks: FeatureCollection;
	track_points: FeatureCollection;
	skippedSentences: number;
	invalidFixes: number;
	unsupportedSentences: number;
}

const DAY = 86_400_000;
const POSITION_IDS = new Set(['RMC', 'GGA', 'GLL']);
const NUMBER = /^-?\d+(?:\.\d+)?$/;

// ライブラリのGGA/GLL時刻は実行日のDateになるため、日付のない記録には使わない。
const readClock = (raw: string): number => {
	if (!/^\d{6}(?:\.\d+)?$/.test(raw)) throw new Error('Invalid UTC');
	const hours = Number(raw.slice(0, 2));
	const minutes = Number(raw.slice(2, 4));
	const seconds = Number(raw.slice(4));
	if (hours > 23 || minutes > 59 || seconds >= 60) throw new Error('Invalid UTC');
	return (hours * 3600 + minutes * 60 + Number(raw.slice(4, 6))) * 1000
		+ Number((raw.split('.')[1] ?? '').padEnd(3, '0').slice(0, 3));
};

const readDate = (day: string, month: string, year: string): number => {
	if (!/^\d{2}$/.test(day) || !/^\d{2}$/.test(month) || !/^\d{4}$/.test(year)) {
		throw new Error('Invalid date');
	}
	const value = Date.UTC(Number(year), Number(month) - 1, Number(day));
	const date = new Date(value);
	if (
		date.getUTCDate() !== Number(day) || date.getUTCMonth() + 1 !== Number(month)
		|| date.getUTCFullYear() !== Number(year)
	) throw new Error('Invalid date');
	return value;
};

const coordinate = (raw: string, hemisphere: string, latitude: boolean): number => {
	const pattern = latitude ? /^\d{4}(?:\.\d+)?$/ : /^\d{5}(?:\.\d+)?$/;
	if (
		!pattern.test(raw) || !(latitude ? /^[NS]$/ : /^[EW]$/).test(hemisphere)
		|| Number(raw) % 100 >= 60
	) throw new Error('Invalid coordinate');
	// nmea-simple 3.xは小数点のない度分を0とするため、ライブラリへ渡す前に補う。
	const normalized = raw.includes('.') ? raw : `${raw}.0`;
	const value = latitude
		? parseLatitude(normalized, hemisphere)
		: parseLongitude(normalized, hemisphere);
	if (!Number.isFinite(value) || Math.abs(value) > (latitude ? 90 : 180)) {
		throw new Error('Invalid coordinate');
	}
	return value;
};

export const parseNmea = (text: string): NmeaResult => {
	if (text.length > formatNmea.limits.maxTextLength) {
		throw new Error('NMEAログは32 MiB以下に分割してください');
	}
	const result: NmeaResult = {
		tracks: { type: 'FeatureCollection', features: [] },
		track_points: { type: 'FeatureCollection', features: [] },
		skippedSentences: 0,
		invalidFixes: 0,
		unsupportedSentences: 0
	};
	let segment: Feature<PointGeometry>[] = [];
	let lastClock: number | undefined;
	let date: number | undefined;
	let dateClock: number | undefined;
	let lastAbsolute: number | undefined;
	let trackIndex = 0;
	const flush = () => {
		if (segment.length >= 2) {
			const first = segment[0].properties;
			const last = segment[segment.length - 1].properties;
			result.tracks.features.push({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: segment.map(point => point.geometry.coordinates)
				},
				properties: {
					source_format: 'nmea',
					track_index: trackIndex,
					point_count: segment.length,
					start_time_utc: first.time_utc,
					end_time_utc: last.time_utc,
					...(first.time ? { time: first.time } : {}),
					...(last.time ? { end_time: last.time } : {})
				}
			});
		}
		if (segment.length) trackIndex++;
		segment = [];
	};
	// split()でログ全体の行配列を作らない。
	for (const match of text.matchAll(/[^\r\n]+/g)) {
		const line = match[0].trim();
		if (!line) continue;
		const id = /^\$[A-Z0-9]{2}([A-Z]{3}),/.exec(line)?.[1];
		if (!id || !POSITION_IDS.has(id) && id !== 'ZDA' && id !== 'DTM') {
			result.unsupportedSentences++;
			continue;
		}
		let unsupportedDatum = false;
		try {
			if (line.length > 1024 || !/\*[\dA-Fa-f]{2}$/.test(line)) {
				throw new Error('Invalid sentence');
			}
			const packet = parseNmeaSentence(line);
			const fields = line.slice(0, line.indexOf('*')).split(',');
			if (packet.sentenceId === 'DTM') {
				// ローカル測地系をWGS84と誤って配置しない。DTMオフセット変換は対象外。
				if (packet.datumCode !== 'W84') unsupportedDatum = true;
				else continue;
			} else if (packet.sentenceId === 'ZDA') {
				const nextDate = readDate(fields[2], fields[3], fields[4]);
				const nextClock = readClock(fields[1]);
				date = nextDate;
				dateClock = nextClock;
				continue;
			} else if (
				packet.sentenceId === 'RMC' || packet.sentenceId === 'GGA'
				|| packet.sentenceId === 'GLL'
			) {
				const valid = packet.sentenceId === 'GGA'
					? /^[1-8]$/.test(fields[6])
					: packet.status === 'valid' && packet.faaMode !== 'N';
				if (!valid) {
					result.invalidFixes++;
					flush();
					continue;
				}
				const timeIndex = id === 'GLL' ? 5 : 1;
				const latitudeIndex = id === 'RMC' ? 3 : id === 'GGA' ? 2 : 1;
				const latitude = coordinate(fields[latitudeIndex], fields[latitudeIndex + 1], true);
				const longitude = coordinate(
					fields[latitudeIndex + 2],
					fields[latitudeIndex + 3],
					false
				);
				const clock = readClock(fields[timeIndex]);
				let explicitDate: number | undefined;
				if (id === 'RMC' && fields[9]) {
					const raw = fields[9];
					if (!/^\d{6}$/.test(raw)) throw new Error('Invalid date');
					const year = Number(raw.slice(4));
					explicitDate = readDate(
						raw.slice(0, 2),
						raw.slice(2, 4),
						String(year + (year < 73 ? 2000 : 1900))
					);
				}
				if (explicitDate !== undefined) date = explicitDate;
				else if (
					dateClock !== undefined && clock < dateClock - DAY / 2 && date !== undefined
				) date += DAY;
				const absolute = date === undefined ? undefined : date + clock;
				const previous = segment[segment.length - 1];
				const delta = absolute !== undefined && lastAbsolute !== undefined
					? absolute - lastAbsolute
					: lastClock === undefined
					? 0
					: (clock - lastClock + DAY / 2 + DAY) % DAY - DAY / 2;
				if (
					delta < 0 || delta > 300_000
					|| previous && Math.abs(longitude - previous.geometry.coordinates[0]) > 180
				) flush();
				const properties: Feature<PointGeometry>['properties'] = {
					source_format: 'nmea',
					sentence: id,
					talker: line.slice(1, 3),
					time_utc: new Date(clock).toISOString().slice(11, 23),
					...(absolute === undefined ? {} : { time: new Date(absolute).toISOString() })
				};
				const addNumber = (key: string, raw: string, value: number) => {
					if (NUMBER.test(raw) && Number.isFinite(value)) properties[key] = value;
				};
				if (packet.sentenceId === 'GGA') {
					properties.fix_type = packet.fixType;
					addNumber('satellites', fields[7], packet.satellitesInView);
					addNumber('hdop', fields[8], packet.horizontalDilution);
					if (fields[10] === 'M') {
						addNumber('altitude_msl', fields[9], packet.altitudeMeters);
					}
					if (fields[12] === 'M') {
						addNumber('geoid_separation', fields[11], packet.geoidalSeperation);
					}
				} else if (packet.sentenceId === 'RMC') {
					addNumber('speed', fields[7], packet.speedKnots * 1852 / 3600);
					addNumber('course_true', fields[8], packet.trackTrue);
				}
				const same = segment[segment.length - 1];
				if (
					same && clock === lastClock && same.geometry.coordinates[0] === longitude
					&& same.geometry.coordinates[1] === latitude
				) {
					Object.assign(same.properties, properties);
				} else {
					if (result.track_points.features.length >= formatNmea.limits.maxSourcePoints) {
						throw new RangeError(
							'NMEAの計測点が25万件を超えています。ログを分割してください'
						);
					}
					const point: Feature<PointGeometry> = {
						type: 'Feature',
						geometry: { type: 'Point', coordinates: [longitude, latitude] },
						properties: {
							...properties,
							track_index: trackIndex,
							point_index: result.track_points.features.length
						}
					};
					segment.push(point);
					result.track_points.features.push(point);
				}
				lastClock = clock;
				dateClock = clock;
				lastAbsolute = absolute;
			}
		} catch (error) {
			if (error instanceof RangeError) throw error;
			result.skippedSentences++;
			flush();
		}
		if (unsupportedDatum) {
			throw new Error('WGS84以外の測地系が指定されたNMEAログには未対応です');
		}
	}
	flush();
	if (!result.track_points.features.length) {
		throw new Error(
			'有効な位置情報がありません。チェックサム付きのRMC・GGA・GLLを含むNMEAログを選択してください'
		);
	}
	return result;
};
