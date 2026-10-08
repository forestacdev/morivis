import { Iso8601, JulianDate } from '@cesium/engine';
import { formatCzml } from './definition';

type Packet = Record<string, unknown>;
export const isObject = (value: unknown): value is Packet =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

export const isCzmlDocument = (value: unknown): value is Packet[] =>
	Array.isArray(value) && isObject(value[0]) && value[0].id === 'document'
	&& typeof value[0].version === 'string';

const pick = (value: Packet, keys: string[]): Packet =>
	Object.fromEntries(
		keys.filter(key => value[key] !== undefined).map(key => [key, value[key]])
	);

export const prepareCzml = (text: string) => {
	if (text.length > formatCzml.limits.maxTextLength) {
		throw new Error('CZMLは32 MiB以下に分割してください');
	}
	let input: unknown;
	try {
		input = JSON.parse(text.replace(/^\uFEFF/, ''));
	} catch {
		throw new Error('CZMLのJSONを読み取れませんでした');
	}
	if (!isCzmlDocument(input)) {
		throw new Error('先頭にidがdocumentのパケットを含むCZMLを選択してください');
	}
	if (input[0].version !== '1.0') throw new Error('CZML 1.0以外のバージョンには未対応です');
	if (input.length > formatCzml.limits.maxFeatures) {
		throw new Error('CZMLのパケット数が上限を超えています');
	}
	const times = new Map<string, JulianDate>();
	const warnings = new Set<string>();
	const references = new Map<string, Set<string>>();
	let sourcePoints = 0;
	let hasInertial = false;
	const addTime = (raw: unknown, epoch?: unknown, intervalBoundary = false) => {
		let time: JulianDate;
		try {
			if (typeof raw === 'string') time = JulianDate.fromIso8601(raw);
			else if (typeof raw === 'number' && Number.isFinite(raw) && typeof epoch === 'string') {
				time = JulianDate.addSeconds(JulianDate.fromIso8601(epoch), raw, new JulianDate());
			} else throw new Error('Invalid timestamp');
			// Cesiumの無期限区間の境界は観測時刻ではない。パケットには残し、
			// show/availabilityの評価に使うが、変換やタイムラインには加えない。
			if (
				intervalBoundary
				&& (JulianDate.equals(time, Iso8601.MINIMUM_VALUE)
					|| JulianDate.equals(time, Iso8601.MAXIMUM_VALUE))
			) return;
			const iso = JulianDate.toIso8601(time, 3);
			if (!/^\d{4}-/.test(iso)) throw new Error('Unsupported year');
			times.set(iso, time);
		} catch {
			throw new Error('CZMLの時刻が不正です。秒数の時刻にはepochが必要です');
		}
		if (times.size > formatCzml.limits.maxSamples) {
			throw new Error('CZMLの時刻数が1万件を超えています。ファイルを分割してください');
		}
	};
	const addInterval = (value: unknown) => {
		for (const interval of Array.isArray(value) ? value : [value]) {
			if (typeof interval !== 'string') throw new Error('CZMLの時間区間が不正です');
			const ends = interval.split('/');
			if (ends.length !== 2) throw new Error('CZMLの時間区間が不正です');
			addTime(ends[0], undefined, true);
			addTime(ends[1], undefined, true);
			if (
				JulianDate.compare(JulianDate.fromIso8601(ends[0]), JulianDate.fromIso8601(ends[1]))
					> 0
			) {
				throw new Error('CZMLの時間区間の開始が終了より後になっています');
			}
		}
	};
	const validateCoordinates = (values: unknown, key: string, list: boolean, epoch: unknown) => {
		if (key === 'number' && typeof values === 'number' && Number.isFinite(values)) return;
		if (!Array.isArray(values) || !values.length) throw new Error('CZMLの座標配列が不正です');
		const dimensions = key === 'cartesianVelocity'
			? 6
			: key === 'unitQuaternion' || key === 'rgba' || key === 'rgbaf'
			? 4
			: key === 'cartesian2'
			? 2
			: key === 'number'
			? 1
			: 3;
		const sampled = !list && values.length !== dimensions;
		const stride = dimensions + (sampled ? 1 : 0);
		if (values.length % stride) throw new Error('CZMLの座標配列の要素数が不正です');
		for (let i = 0; i < values.length; i += stride) {
			if (sampled) addTime(values[i], epoch);
			const offset = i + (sampled ? 1 : 0);
			const coordinates = values.slice(offset, offset + dimensions);
			if (!coordinates.every(value => typeof value === 'number' && Number.isFinite(value))) {
				throw new Error('CZMLの座標に数値以外が含まれています');
			}
			if (key === 'cartographicDegrees' || key === 'cartographicRadians') {
				const scale = key === 'cartographicDegrees' ? 180 : Math.PI;
				if (Math.abs(coordinates[0]) > scale || Math.abs(coordinates[1]) > scale / 2) {
					throw new Error('CZMLの経緯度が範囲外です');
				}
			}
			sourcePoints++;
			if (sourcePoints > formatCzml.limits.maxSourcePoints) {
				throw new Error('CZMLの入力座標が25万点を超えています');
			}
		}
	};
	const inspect = (
		value: unknown,
		owner: string,
		list = false,
		depth = 0,
		positionReference = false
	): void => {
		if (depth > 64) throw new Error('CZMLの入れ子が深すぎます');
		if (Array.isArray(value)) {
			for (const part of value) inspect(part, owner, list, depth + 1, positionReference);
			return;
		}
		if (!isObject(value)) return;
		if (value.referenceFrame !== undefined) {
			if (value.referenceFrame !== 'FIXED' && value.referenceFrame !== 'INERTIAL') {
				throw new Error('CZMLのreferenceFrameにはFIXEDまたはINERTIALを指定してください');
			}
			if (value.referenceFrame === 'INERTIAL') {
				if (!positionReference) {
					throw new Error(
						'INERTIALはpositionに指定してください。線・面にはpositionへのreferencesを使用してください'
					);
				}
				hasInertial = true;
				warnings.add(
					'INERTIAL座標を時刻ごとに変換します。地球姿勢の実測補正（EOP）は含みません。'
				);
			}
		}
		if (value.interval !== undefined) addInterval(value.interval);
		for (const [key, part] of Object.entries(value)) {
			if (
				[
					'cartesian',
					'cartesianVelocity',
					'cartesian2',
					'rgba',
					'rgbaf',
					'cartographicDegrees',
					'cartographicRadians',
					'unitQuaternion',
					'number'
				]
					.includes(key)
			) {
				if (Array.isArray(part) && Array.isArray(part[0])) {
					for (const ring of part) validateCoordinates(ring, key, true, value.epoch);
				} else validateCoordinates(part, key, list, value.epoch);
			} else if (key === 'reference' || key === 'references' || key === 'velocityReference') {
				for (const reference of Array.isArray(part) ? part : [part]) {
					if (typeof reference !== 'string' || !reference.includes('#')) {
						throw new Error('CZMLの参照が不正です');
					}
					const [target, property] = reference.split('#');
					// 位置間参照だけを許可し、外部URLや任意のプロパティ連鎖へ広げない。
					if (property !== 'position') {
						throw new Error('CZMLの参照はpositionへの参照に対応しています');
					}
					if (positionReference) {
						const targets = references.get(owner) ?? new Set<string>();
						targets.add(target || owner);
						references.set(owner, targets);
					}
				}
			} else if (key !== 'interval') {
				inspect(
					part,
					owner,
					list || key === 'positions' || key === 'holes',
					depth + 1,
					positionReference
				);
			}
		}
	};
	const packets: Packet[] = [];
	const attributes = new Map<string, Record<string, string | number | boolean>>();
	const ids = new Set(input.filter(isObject).map(packet => packet.id));
	let anonymousIndex = 0;
	for (const original of input) {
		if (!isObject(original)) throw new Error('CZMLのパケットがオブジェクトではありません');
		const packet = { ...original };
		if (packet.id === undefined) {
			let id: string;
			do {
				id = `czml-packet-${anonymousIndex++}`;
			} while (ids.has(id));
			packet.id = id;
			ids.add(id);
		}
		if (typeof packet.id !== 'string' || !packet.id) throw new Error('CZMLのidが不正です');
		if (packet.name !== undefined && typeof packet.name !== 'string') {
			throw new Error('CZMLのnameが不正です');
		}
		const clean = pick(packet, [
			'id',
			'name',
			'delete',
			'availability',
			'position',
			'orientation',
			'properties'
		]);
		if (packet.id === 'document') {
			clean.version = packet.version;
			if (isObject(packet.clock)) {
				clean.clock = pick(packet.clock, [
					'interval',
					'currentTime',
					'multiplier',
					'range',
					'step'
				]);
				if (packet.clock.interval !== undefined) addInterval(packet.clock.interval);
				if (packet.clock.currentTime !== undefined) addTime(packet.clock.currentTime);
			}
		} else {
			if (packet.availability !== undefined) addInterval(packet.availability);
			for (const key of ['point', 'path', 'polyline', 'polygon']) {
				if (isObject(packet[key])) {
					clean[key] = pick(packet[key], ['show', 'positions', 'holes']);
				}
			}
			if (isObject(packet.model)) {
				clean.model = pick(packet.model, ['gltf', 'show', 'scale', 'interval']);
				if (
					Object.keys(packet.model).some(key =>
						!['gltf', 'show', 'scale', 'interval'].includes(key)
					)
				) {
					warnings.add(
						'モデル内のアニメーション、最小ピクセルサイズ、地面への追従、色の上書きは再現しません。'
					);
				}
			}
			if (isObject(packet.billboard)) {
				const keys = [
					'image',
					'show',
					'scale',
					'width',
					'height',
					'rotation',
					'color',
					'horizontalOrigin',
					'verticalOrigin',
					'pixelOffset',
					'interval'
				];
				clean.billboard = pick(packet.billboard, keys);
				if (Object.keys(packet.billboard).some(key => !keys.includes(key))) {
					warnings.add(
						'画像マーカーのメートル単位のサイズ、距離による変化、地形への追従、画像の切り抜き、3D方向の指定は再現しません。'
					);
				}
			}
			if (
				Object.keys(packet).some(key =>
					[
						'label',
						'ellipse',
						'ellipsoid',
						'box',
						'cylinder',
						'wall',
						'corridor',
						'rectangle',
						'tileset'
					].includes(key)
				)
			) {
				warnings.add(
					'ラベル・立体図形は再現せず、位置があればポイントとして読み込みます。'
				);
			}
			if (packet.point || packet.path || packet.polyline || packet.polygon) {
				warnings.add('色・線幅などの装飾はmorivisの表示設定を使います。');
			}
		}
		if (clean.position !== undefined || packet.delete === true) references.delete(packet.id);
		inspect(clean.position, packet.id, false, 0, true);
		for (
			const key of [
				'point',
				'path',
				'polyline',
				'polygon',
				'orientation',
				'model',
				'billboard'
			]
		) {
			inspect(clean[key], packet.id);
		}
		// 任意属性はプリミティブな定数に絞る。HTMLや参照を評価する経路を作らない。
		if (isObject(clean.properties)) {
			const properties = attributes.get(packet.id) ?? {};
			if (packet.delete === true) attributes.delete(packet.id);
			for (const [key, value] of Object.entries(clean.properties)) {
				if (['__proto__', 'prototype', 'constructor'].includes(key)) continue;
				if (
					typeof value === 'string' || typeof value === 'boolean'
					|| typeof value === 'number'
				) properties[key] = value;
				else if (isObject(value)) {
					if (value.delete === true) {
						delete properties[key];
						continue;
					}
					for (const type of ['string', 'number', 'boolean']) {
						if (typeof value[type] === type) {
							properties[key] = value[type] as string | number | boolean;
						}
					}
				}
			}
			attributes.set(packet.id, properties);
		}
		// Cesiumの任意属性デコーダーはImageなどDOMの型を参照するため、
		// 定数属性だけを別に保持し、Workerでは幾何・時刻のデコードを利用する。
		delete clean.properties;
		if (packet.delete === true) attributes.delete(packet.id);
		packets.push(clean);
	}
	// 循環参照をCesiumのgetValueへ渡す前に検出する。
	const checked = new Set<string>();
	const checkReferences = (id: string, path = new Set<string>()) => {
		if (checked.has(id)) return;
		if (path.has(id)) throw new Error('CZMLのposition参照が循環しています');
		if (path.size > 64) throw new Error('CZMLのposition参照が深すぎます');
		path.add(id);
		for (const target of references.get(id) ?? []) checkReferences(target, path);
		path.delete(id);
		checked.add(id);
	};
	for (const id of references.keys()) checkReferences(id);
	if (hasInertial && !times.size) {
		throw new Error(
			'INERTIAL座標の変換には時刻が必要です。clock・availability・位置サンプルの時刻を指定してください'
		);
	}
	return {
		hasInertial,
		packets,
		attributes,
		times: [...times.values()].sort(JulianDate.compare),
		warnings: [...warnings]
	};
};
