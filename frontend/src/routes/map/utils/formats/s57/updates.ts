import { formatS57 } from './definition';
import { fieldReader, type Fields, readDefinitions, readRecords, stripTerminator } from './iso8211';

export interface S57UpdateInput {
	name: string;
	bytes: Uint8Array;
}
const fail = (message: string): never => {
	throw new Error(`S-57の更新: ${message}`);
};
const get = (fields: Fields, tag: string): Uint8Array => {
	const values = fields.get(tag);
	if (values?.length !== 1) return fail(`${tag}が欠損または重複しています`);
	return stripTerminator(values[0]);
};
const reader = (fields: Fields, tag: string) => fieldReader(get(fields, tag));
const stem = (name: string) => name.replace(/\.\d{3}$/, '').toLowerCase();
const cellHeader = (fields: Fields) => {
	const dsid = reader(fields, 'DSID');
	if (dsid.u8() !== 10) fail('DSIDが不正です');
	dsid.u32();
	const purpose = dsid.u8();
	dsid.u8();
	const name = dsid.text();
	const edition = dsid.text();
	const updateStart = dsid.position();
	const updateText = dsid.text();
	const updateEnd = dsid.position();
	const applicationDate = dsid.text(8);
	const issueDate = dsid.text(8);
	const standard = dsid.text(4);
	const product = dsid.u8();
	dsid.text();
	dsid.text();
	const profile = dsid.u8();
	const agency = dsid.u16();
	dsid.text();
	dsid.end();
	if (!/^\d+$/.test(updateText) || Number(updateText) > 999 || !/^\d+$/.test(edition)) {
		fail('版・更新番号が不正です');
	}
	if (edition === '0') fail('セルを取り消す更新です。このセルは地図へ追加できません');
	if (standard !== '03.1' || product !== 1 || profile !== (purpose === 1 ? 1 : 2)) {
		fail('ENCの基本・更新プロファイルが不正です');
	}
	const dssi = reader(fields, 'DSSI');
	const structure = dssi.u8();
	const ascii = dssi.u8();
	const national = dssi.u8();
	for (let i = 0; i < 8; i++) dssi.u32();
	dssi.end();
	if (![2, 3].includes(structure) || ascii > 1 || national > 2) {
		fail('データ構造または文字コードが未対応です');
	}
	return {
		name,
		edition,
		update: Number(updateText),
		purpose,
		agency,
		structure,
		ascii,
		national,
		applicationDate,
		issueDate,
		updateStart,
		updateEnd
	};
};
const identity = (fields: Fields) => {
	const tag = fields.has('FRID') ? 'FRID' : 'VRID';
	if (fields.has('FRID') && fields.has('VRID')) fail('地物と空間レコードが混在しています');
	const id = reader(fields, tag);
	const kind = id.u8();
	const number = id.u32();
	if (tag === 'FRID') {
		id.u8();
		id.u8();
		id.u16();
	}
	const version = id.u16();
	const operation = id.u8();
	id.end();
	if (tag === 'FRID' ? kind !== 100 : ![110, 120, 130].includes(kind)) {
		fail('レコード種別が不正です');
	}
	return { tag, key: `${kind}:${number}`, version, operation };
};
const same = (a: Uint8Array, b: Uint8Array) =>
	a.length === b.length && a.every((value, i) => value === b[i]);
const controls = ['FSPC', 'FFPC', 'VRPC', 'SGCC'];
const fixedWidths: Record<string, number> = { FSPT: 8, VRPT: 9, SG2D: 8, SG3D: 12 };

/** フィールドが繰り返されても、その中の項目の添字を連続させる（S-57 §8.3.4–5）。 */
const items = (fields: Fields, tag: string, level = 0): Uint8Array[] => {
	const result: Uint8Array[] = [];
	for (const field of fields.get(tag) ?? []) {
		const bytes = stripTerminator(field, tag === 'NATF' && level === 2);
		const width = fixedWidths[tag];
		if (width) {
			if (bytes.length % width) fail(`${tag}の項目長が不正です`);
			for (let offset = 0; offset < bytes.length; offset += width) {
				result.push(bytes.subarray(offset, offset + width));
			}
		} else {
			const r = fieldReader(bytes);
			while (r.remaining()) {
				const start = r.position();
				if (tag === 'FFPT') {
					r.u16();
					r.u32();
					r.u16();
					r.u8();
				} else r.u16();
				r.text(undefined, level);
				result.push(bytes.subarray(start, r.position()));
			}
		}
	}
	return result;
};
const field = (values: readonly Uint8Array[], wide = false) => {
	const length = values.reduce((sum, value) => sum + value.length, wide ? 2 : 1);
	if (length > formatS57.limits.maxDatasetBytes) {
		fail('更新後のフィールド容量が上限を超えています');
	}
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const value of values) {
		bytes.set(value, offset);
		offset += value.length;
	}
	bytes[offset] = 30;
	return bytes;
};
const putItems = (target: Fields, tag: string, values: Uint8Array[], wide = false) => {
	if (values.length) target.set(tag, [field(values, wide)]);
	else target.delete(tag);
};
const mergeAttributes = (target: Fields, patch: Fields, tag: string, level: number) => {
	if (!patch.has(tag)) return;
	const values = new Map<number, Uint8Array>();
	for (const source of [target, patch]) {
		const seen = new Set<number>();
		for (const item of items(source, tag, level)) {
			const r = fieldReader(item);
			const code = r.u16();
			const value = r.text(undefined, level);
			if (seen.has(code)) fail(`${tag}の属性コードが重複しています`);
			seen.add(code);
			if (source === patch && value === '\x7f') values.delete(code);
			else values.set(code, item);
		}
	}
	putItems(target, tag, [...values.values()], tag === 'NATF' && level === 2);
};
const mergeList = (target: Fields, patch: Fields, tag: string, control: string) => {
	if (!patch.has(tag) && !patch.has(control)) return;
	const before = items(target, tag);
	const incoming = items(patch, tag);
	if (!patch.has(control)) {
		// §8.4.3.3: 中間座標のない直線エッジへ座標を追加する場合だけSGCCを省略する。
		if (
			control !== 'SGCC' || before.length || !incoming.length
			|| get(target, 'VRID')[0] !== 130
		) {
			fail(`${tag}の更新制御フィールド${control}が必要です`);
		}
		putItems(target, tag, incoming);
		return;
	}
	const r = reader(patch, control);
	const operation = r.u8();
	const start = r.u16() - 1;
	const count = r.u16();
	r.end();
	if (
		![1, 2, 3].includes(operation) || !count || start < 0 || start > before.length
		|| (operation !== 1 && start + count > before.length)
	) fail(`${control}の更新位置・件数が範囲外です`);
	if (incoming.length !== (operation === 2 ? 0 : count)) {
		fail(`${control}の件数と${tag}の項目数が一致しません`);
	}
	const result = before.slice(0, start);
	for (const item of incoming) result.push(item);
	for (let i = start + (operation === 1 ? 0 : count); i < before.length; i++) {
		result.push(before[i]);
	}
	putItems(target, tag, result);
};
const modify = (original: Fields, patch: Fields, header: ReturnType<typeof cellHeader>): Fields => {
	const result = new Map(original);
	const id = identity(patch);
	const updatedId = get(original, id.tag).slice();
	// 識別情報は維持し、RVERだけを更新する。異なる地物の置換を防ぐ。
	const patchId = get(patch, id.tag);
	const versionOffset = id.tag === 'FRID' ? 9 : 5;
	if (!same(updatedId.subarray(0, versionOffset), patchId.subarray(0, versionOffset))) {
		fail(`${id.key}の識別情報が変わっています`);
	}
	updatedId.set(patchId.subarray(versionOffset, versionOffset + 2), versionOffset);
	result.set(id.tag, [field([updatedId])]);
	if (
		patch.has('FOID')
		&& (!original.has('FOID') || !same(get(original, 'FOID'), get(patch, 'FOID')))
	) fail('FOIDが基本セルと一致しません');
	mergeAttributes(result, patch, 'ATTF', header.ascii);
	mergeAttributes(result, patch, 'NATF', header.national);
	mergeAttributes(result, patch, 'ATTV', 0);
	mergeList(result, patch, 'FSPT', 'FSPC');
	mergeList(result, patch, 'FFPT', 'FFPC');
	mergeList(result, patch, 'VRPT', 'VRPC');
	const coordinateTags = ['SG2D', 'SG3D'].filter(tag => original.has(tag) || patch.has(tag));
	if (coordinateTags.length > 1) fail('2D・3D座標を混在させる更新は未対応です');
	if (patch.has('SGCC') && !coordinateTags.length) fail('SGCCの対象座標がありません');
	for (const tag of coordinateTags) mergeList(result, patch, tag, 'SGCC');
	return result;
};

/** 更新は一時的なレコード集合へ適用し、すべて成功してからGeoJSON変換へ渡す。 */
export const readUpdatedRecords = (
	base: Uint8Array,
	updates: readonly S57UpdateInput[],
	visit: (fields: Fields, ddr: boolean) => void
) => {
	if (updates.length + 1 > formatS57.limits.maxFiles) fail('ファイル数が上限を超えています');
	if (
		[base, ...updates.map(update => update.bytes)].some(bytes =>
			bytes.length > formatS57.limits.maxFileBytes
		)
	) fail('ファイル容量が64 MiBの上限を超えています');
	if (
		base.length + updates.reduce((sum, update) => sum + update.bytes.length, 0)
			> formatS57.limits.maxDatasetBytes
	) fail('一式の容量が128 MiBの上限を超えています');
	let recordCount = 0;
	const readCell = (bytes: Uint8Array, updating: boolean) => {
		let definitions: Fields = new Map();
		let tags = new Set<string>();
		let general: Fields | undefined;
		let parameters: Fields | undefined;
		const records: Fields[] = [];
		readRecords(bytes, (fields, ddr) => {
			if (++recordCount > formatS57.limits.maxSections) {
				fail('レコード数が上限を超えています');
			}
			if (ddr) {
				definitions = fields;
				tags = readDefinitions(fields, updating);
				return;
			}
			for (const tag of fields.keys()) {
				if (tag !== '0001' && !tags.has(tag)) {
					fail(`${tag}は未対応またはDDRに定義がありません`);
				}
			}
			if (fields.has('DSID')) {
				if (general) fail('DSIDが重複しています');
				general = fields;
			} else if (fields.has('DSPM')) {
				if (parameters || updating) fail('DSPMの更新または重複は未対応です');
				parameters = fields;
			} else {
				const id = identity(fields);
				const allowed = id.tag === 'FRID'
					? ['0001', 'FRID', 'FOID', 'ATTF', 'NATF', 'FFPT', 'FFPC', 'FSPT', 'FSPC']
					: ['0001', 'VRID', 'ATTV', 'VRPC', 'VRPT', 'SGCC', 'SG2D', 'SG3D'];
				for (const tag of fields.keys()) {
					if (!allowed.includes(tag)) fail(`${id.tag}内の${tag}は未対応です`);
				}
				records.push(fields);
			}
		});
		if (!general || (!updating && !parameters)) return fail('データセット情報が欠損しています');
		return { definitions, general, parameters, records, header: cellHeader(general) };
	};
	const initial = readCell(base, false);
	if (initial.header.purpose !== 1) fail('基本ファイル（.000）が必要です');
	const records = new Map<string, Fields>();
	const used = new Set<string>();
	for (const fields of initial.records) {
		const id = identity(fields);
		if (
			id.operation !== 1 || id.version < 1 || used.has(id.key)
			|| controls.some(tag => fields.has(tag))
		) fail('基本セルのレコードが不正です');
		records.set(id.key, fields);
		used.add(id.key);
	}
	let latest = initial.header;
	// ヘッダー内の番号も検査する。外部ファイル名だけを信用しない。
	const ordered = [...updates].sort((a, b) =>
		Number(a.name.slice(-3)) - Number(b.name.slice(-3))
	);
	for (const update of ordered) {
		const cell = readCell(update.bytes, true);
		const header = cell.header;
		if (
			header.purpose !== 2 || stem(header.name) !== stem(initial.header.name)
			|| stem(update.name) !== stem(header.name) || header.agency !== initial.header.agency
		) fail('更新ファイルのセル名・提供機関が基本セルと一致しません');
		if (header.edition !== initial.header.edition) {
			fail('更新ファイルの版が基本セルと一致しません');
		}
		if (
			!/\.\d{3}$/.test(update.name) || Number(update.name.slice(-3)) !== header.update
			|| (/\.\d{3}$/.test(header.name) && Number(header.name.slice(-3)) !== header.update)
		) fail('ファイル名とDSIDの更新番号が一致しません');
		if (header.update !== latest.update + 1) {
			fail(
				`更新番号が連続していません。.${
					String(latest.update + 1).padStart(3, '0')
				}が必要です`
			);
		}
		if (
			header.structure !== initial.header.structure || header.ascii !== initial.header.ascii
			|| header.national !== initial.header.national
		) fail('更新ファイルの構造・文字コードが基本セルと一致しません');
		for (const [tag, values] of cell.definitions) {
			if (!initial.definitions.has(tag)) initial.definitions.set(tag, values);
		}
		for (const patch of cell.records) {
			const id = identity(patch);
			const previous = records.get(id.key);
			if (id.operation === 1) {
				if (used.has(id.key) || id.version !== 1 || controls.some(tag => patch.has(tag))) {
					fail(`${id.key}の追加命令・レコード版が不正です`);
				}
				records.set(id.key, patch);
				used.add(id.key);
			} else {
				if (!previous) fail(`${id.key}の更新対象がありません`);
				if (id.version !== identity(previous!).version + 1) {
					fail(`${id.key}のレコード版RVERが連続していません`);
				}
				if (id.operation === 2) {
					if ([...patch.keys()].some(tag => tag !== '0001' && tag !== id.tag)) {
						fail('削除命令に余分なフィールドがあります');
					}
					records.delete(id.key);
				} else if (id.operation === 3) {
					records.set(id.key, modify(previous!, patch, header));
				} else fail('レコード更新命令RUINが不正です');
			}
		}
		latest = header;
	}
	const raw = get(initial.general, 'DSID');
	const tail = raw.slice(initial.header.updateEnd);
	// UADTは基本セルの再発行日、ISDTは適用済み更新の発行日。
	tail.set(new TextEncoder().encode(latest.issueDate), 8);
	initial.general.set('DSID', [
		field([
			raw.subarray(0, initial.header.updateStart),
			new TextEncoder().encode(`${latest.update}\x1f`),
			tail
		])
	]);
	visit(initial.definitions, true);
	visit(initial.general, false);
	visit(initial.parameters!, false);
	for (const fields of records.values()) visit(fields, false);
};
