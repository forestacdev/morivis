import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import { decodeAisPayload } from './decoder';
import { aisLimits, formatAis } from './definition';
import { type AisSentence, parseAisSentence } from './sentence';

export interface AisResult {
	tracks: FeatureCollection;
	track_points: FeatureCollection;
	vesselCount: number;
	skippedSentences: number;
	invalidPositions: number;
	unsupportedMessages: number;
	incompleteMessages: number;
	untimedPoints: number;
	warnings: string[];
}
type Properties = Feature['properties'];
type Pending = { parts: AisSentence[]; firstLine: number; count: number; };
type Vessel = {
	metadata: Properties;
	generation: number;
	points: { feature: Feature; generation: number; }[];
};
const empty = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] });
const bounded = (value: unknown, max: number) =>
	typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < max ? value : null;

export const parseAis = (text: string): AisResult => {
	if (text.length > formatAis.limits.maxTextLength) {
		throw new Error('AISログは32 MiB以下に分割してください');
	}
	const result: AisResult = {
		tracks: empty(),
		track_points: empty(),
		vesselCount: 0,
		skippedSentences: 0,
		invalidPositions: 0,
		unsupportedMessages: 0,
		incompleteMessages: 0,
		untimedPoints: 0,
		warnings: []
	};
	const pending = new Map<string, Pending>();
	const vessels = new Map<string, Vessel>();
	let lineNumber = 0;
	let aisCount = 0;
	let discontinuity = 0;
	const clearPending = () => {
		result.incompleteMessages += pending.size;
		pending.clear();
	};
	for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		lineNumber++;
		let sentence: AisSentence | null;
		try {
			sentence = parseAisSentence(line);
		} catch {
			result.skippedSentences++;
			clearPending();
			// 読めない報告をまたぐ航跡を作らない。
			discontinuity++;
			continue;
		}
		if (!sentence) continue;
		aisCount++;
		if (sentence.count > 1) {
			const key = JSON.stringify([
				sentence.source,
				sentence.identifier,
				sentence.channel,
				sentence.sequence,
				sentence.group
			]);
			let group = pending.get(key);
			if (
				group
				&& (group.count !== sentence.count
					|| lineNumber - group.firstLine > aisLimits.maxFragmentLineGap
					|| group.parts[sentence.number - 1])
			) {
				result.incompleteMessages++;
				pending.delete(key);
				group = undefined;
			}
			// IDなしの分割文は受信順が連続する場合だけ組み立てる。
			if (
				!sentence.sequence && !sentence.group
				&& sentence.number !== (group?.parts.length ?? 0) + 1
			) {
				result.incompleteMessages++;
				pending.delete(key);
				continue;
			}
			if (!group) {
				if (pending.size >= aisLimits.maxPendingMessages) {
					const oldest = pending.keys().next().value!;
					pending.delete(oldest);
					result.incompleteMessages++;
				}
				group = { parts: [], firstLine: lineNumber, count: sentence.count };
				pending.set(key, group);
			}
			group.parts[sentence.number - 1] = sentence;
			if (group.parts.filter(Boolean).length !== group.count) continue;
			pending.delete(key);
			const first = group.parts[0], last = group.parts[group.count - 1];
			sentence = {
				...first,
				payload: group.parts.map(part => part.payload).join(''),
				fill: last.fill
			};
		}
		let message: ReturnType<typeof decodeAisPayload>;
		try {
			message = decodeAisPayload(sentence.payload, sentence.fill, sentence.channel);
		} catch {
			result.skippedSentences++;
			discontinuity++;
			continue;
		}
		if (!message) {
			result.unsupportedMessages++;
			continue;
		}
		if (!Number.isInteger(message.mmsi) || message.mmsi <= 0 || message.mmsi > 999999999) {
			result.skippedSentences++;
			continue;
		}
		const mmsi = String(message.mmsi).padStart(9, '0');
		let vessel = vessels.get(mmsi);
		if (!vessel) {
			if (vessels.size >= aisLimits.maxVessels) {
				throw new Error('船舶数が上限の20,000隻を超えています。ログを分割してください');
			}
			vessel = { metadata: {}, generation: 0, points: [] };
			vessels.set(mmsi, vessel);
		}
		if (!('lon' in message)) {
			for (
				const [from, to] of [
					['name', 'name'],
					['callsign', 'callsign'],
					['typeAndCargo', 'ship_type'],
					['imo', 'imo'],
					['destination', 'destination'],
					['draught', 'draught']
				]
			) {
				const value = (message as unknown as Record<string, unknown>)[from];
				if (typeof value === 'string' && value.trim()) vessel.metadata[to] = value;
				if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
					vessel.metadata[to] = value;
				}
			}
			continue;
		}
		if (
			message.lon === null || message.lat === null || !Number.isFinite(message.lon)
			|| !Number.isFinite(message.lat) || Math.abs(message.lon) > 180
			|| Math.abs(message.lat) > 90
		) {
			result.invalidPositions++;
			vessel.generation++;
			continue;
		}
		if (result.track_points.features.length >= formatAis.limits.maxSourcePoints) {
			throw new Error('位置報告が上限の250,000点を超えています。ログを分割してください');
		}
		const feature: Feature = {
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [message.lon, message.lat] },
			properties: {
				mmsi,
				message_type: message.type,
				sentence: sentence.identifier,
				source: sentence.source,
				channel: sentence.channel,
				line: lineNumber,
				source_format: 'AIS',
				...('navStatus' in message ? { nav_status: message.navStatus } : {}),
				...(sentence.time ? { time: sentence.time, time_source: sentence.timeSource! } : {})
			}
		};
		for (
			const [key, value, max] of [
				['speed', message.speedOverGround, 102.3],
				['course', message.courseOverGround, 360],
				['heading', message.heading, 360],
				['utc_second', message.utcSecond, 60]
			] as const
		) {
			const valid = bounded(value, max);
			if (valid !== null) feature.properties[key] = valid;
		}
		if (!sentence.time) result.untimedPoints++;
		result.track_points.features.push(feature);
		vessel.points.push({ feature, generation: discontinuity + vessel.generation });
	}
	clearPending();
	if (!aisCount && !result.skippedSentences) {
		throw new Error('AIVDM / AIVDO形式のAISログが見つかりません');
	}
	for (const [mmsi, vessel] of vessels) {
		if (!vessel.points.length) continue;
		result.vesselCount++;
		let track: Feature[] = [], previousGeneration = -1, segment = 0;
		const finish = () => {
			if (track.length >= 2) {
				result.tracks.features.push({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: track.map(f => {
							if (f.geometry.type !== 'Point') throw new Error('AIS位置が不正です');
							return f.geometry.coordinates;
						})
					},
					properties: {
						...vessel.metadata,
						mmsi,
						segment: segment++,
						point_count: track.length,
						source: track[0].properties.source,
						source_format: 'AIS',
						...(track[0].properties.time
							? {
								start_time: track[0].properties.time,
								end_time: track.at(-1)!.properties.time
							}
							: {})
					}
				});
			}
			track = [];
		};
		for (const { feature, generation } of vessel.points) {
			Object.assign(feature.properties, vessel.metadata);
			const previous = track.at(-1);
			if (
				previous && previous.geometry.type === 'Point' && feature.geometry.type === 'Point'
			) {
				const a = previous.properties, b = feature.properties;
				const delta = typeof a.time === 'string' && typeof b.time === 'string'
					? Date.parse(b.time) - Date.parse(a.time)
					: 0;
				if (
					generation !== previousGeneration || a.source !== b.source
					|| !!a.time !== !!b.time || delta < 0 || delta > aisLimits.trackGapMs
					|| Math.abs(previous.geometry.coordinates[0] - feature.geometry.coordinates[0])
						> 180
				) finish();
			}
			track.push(feature);
			previousGeneration = generation;
		}
		finish();
	}
	return result;
};
