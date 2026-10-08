import type { FeatureCollection } from '$routes/map/types/geojson';
import buffer from '@turf/buffer';

import { emptyTyphoonData, type TyphoonData } from './types';
const record = (value: unknown): Record<string, unknown> =>
	value !== null && typeof value === 'object' && !Array.isArray(value)
		? value as Record<string, unknown>
		: {};
const text = (value: unknown) => typeof value === 'string' ? value : '';
const time = (value: unknown): string => {
	const v = record(value);
	const raw = text(v.UTC) || text(v.JST);
	if (!raw || !Number.isFinite(Date.parse(raw))) {
		throw new Error('台風データの日時を読み取れません');
	}
	return new Date(raw).toISOString();
};
const coordinate = (value: unknown): [number, number] => {
	if (
		!Array.isArray(value) || value.length !== 2
		|| !value.every(v => typeof v === 'number' && Number.isFinite(v)) || Math.abs(value[0]) > 90
		|| Math.abs(value[1]) > 180
	) {
		throw new Error('台風データの座標を読み取れません');
	}
	// 気象庁の描画JSONは緯度・経度順。GeoJSONは経度・緯度順。
	return [value[1], value[0]];
};
type Properties = Record<string, string | number | boolean>;
const addLine = (target: FeatureCollection, coordinates: number[][], properties: Properties) => {
	let segment: [number, number][] = [];
	const flush = () => {
		if (segment.length >= 2) {
			target.features.push({
				type: 'Feature',
				geometry: { type: 'LineString', coordinates: segment },
				properties: { ...properties }
			});
		}
		segment = [];
	};
	for (const xy of coordinates) {
		const previous = segment.at(-1);
		if (previous && Math.abs(previous[0] - xy[0]) > 180) {
			const edge = previous[0] > 0 ? 180 : -180;
			const nextLongitude = xy[0] + (previous[0] > 0 ? 360 : -360);
			const fraction = (edge - previous[0]) / (nextLongitude - previous[0]);
			const latitude = previous[1] + fraction * (xy[1] - previous[1]);
			segment.push([edge, latitude]);
			flush();
			segment.push([-edge, latitude]);
		}
		segment.push([xy[0], xy[1]]);
	}
	flush();
};

export const convertTyphoonForecast = (data: unknown, cyclone: string): TyphoonData => {
	if (!Array.isArray(data) || data.length > 1000) {
		throw new Error('台風の描画データ形式が変わっています');
	}
	const title = record(data.find(row => record(row).part === 'title'));
	const issue = time(title.issue);
	const number = text(title.typhoonNumber);
	const name = text(record(title.name).jp) || text(record(title.name).en) || cyclone;
	const label = number ? `台風${Number(number.slice(-2))}号 ${name}` : name;
	const common: Properties = { cyclone, typhoon_number: number, name, label, issue_time: issue };
	const result = emptyTyphoonData();
	const centers: { xy: [number, number]; hours: number; properties: Properties; }[] = [];
	for (const value of data) {
		const row = record(value);
		if (row.part === 'title') continue;
		if (!row.center) continue;
		const hours = row.advancedHours;
		if (typeof hours !== 'number' || !Number.isFinite(hours) || hours < 0 || hours > 240) {
			throw new Error('台風の予報時間を読み取れません');
		}
		const xy = coordinate(row.center);
		const properties: Properties = {
			...common,
			valid_time: time(row.validtime),
			forecast_hours: hours,
			kind: hours === 0 ? '実況' : '予報'
		};
		result.centers.features.push({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: xy },
			properties
		});
		centers.push({ xy, hours, properties });
		for (
			const [key, kind] of [['preTyphoon', '発達前の経路'], ['typhoon', '実況経路']] as const
		) {
			const track = record(row.track)[key];
			if (track === undefined) continue;
			if (!Array.isArray(track) || track.length > 10000) {
				throw new Error('台風経路を読み取れません');
			}
			addLine(result.tracks, track.map(coordinate), { ...properties, kind });
		}
		const circle = record(row.probabilityCircle);
		if (circle.radius !== undefined) {
			const radius = circle.radius;
			if (
				typeof radius !== 'number' || !Number.isFinite(radius) || radius < 0
				|| radius > 5000000
			) throw new Error('予報円の半径を読み取れません');
			if (radius > 0) {
				const polygon = buffer({ type: 'Point', coordinates: xy }, radius, {
					units: 'meters',
					steps: 32
				});
				if (!polygon || polygon.geometry.type !== 'Polygon') {
					throw new Error('予報円を作成できません');
				}
				addLine(result.circles, polygon.geometry.coordinates[0], {
					...properties,
					kind: '予報円',
					radius_km: radius / 1000,
					probability: 70
				});
			}
			if (circle.tangent !== undefined) {
				if (!Array.isArray(circle.tangent) || circle.tangent.length > 10) {
					throw new Error('予報円の接線を読み取れません');
				}
				for (const line of circle.tangent) {
					if (!Array.isArray(line) || line.length !== 2) {
						throw new Error('予報円の接線を読み取れません');
					}
					addLine(result.circles, line.map(coordinate), {
						...properties,
						kind: '予報円の接線'
					});
				}
			}
		}
	}
	centers.sort((a, b) => a.hours - b.hours);
	for (let i = 1; i < centers.length; i++) {
		addLine(result.tracks, [centers[i - 1].xy, centers[i].xy], {
			...centers[i].properties,
			kind: '予報中心線'
		});
	}
	if (!centers.length) throw new Error('台風の中心位置が取得できませんでした');
	return result;
};
