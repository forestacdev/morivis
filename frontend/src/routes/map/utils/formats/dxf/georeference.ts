import { type EpsgCode, getEpsgInfo, isValidEpsg } from '$routes/map/utils/proj/dict';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export interface CadGeoreference {
	epsg: EpsgCode;
	metersPerUnit: number;
}

/** GEODATAの投影グリッドだけを扱う。ローカルグリッドの基準点を投影座標と誤認しない。 */
export const readCadGeoreference = (text: string): CadGeoreference | undefined => {
	const records: { type: string; tags: [number, string][]; }[] = [];
	let record: typeof records[number] | undefined;
	let section = '';
	let nextSection = false;
	// 全図形の文字列配列を保持せず、必要なOBJECTS/TABLESのレコードだけ取り出す。
	for (const pair of text.matchAll(/([^\r\n]*)\r?\n([^\r\n]*)(?:\r?\n|$)/g)) {
		const code = Number(pair[1].trim());
		const value = pair[2].trim();
		if (nextSection && code === 2) {
			section = value;
			nextSection = false;
		}
		if (code === 0) {
			if (record) records.push(record);
			record = undefined;
			if (value === 'SECTION') nextSection = true;
			if (value === 'ENDSEC') section = '';
			if (
				(section === 'OBJECTS' && value === 'GEODATA')
				|| (section === 'TABLES' && value === 'BLOCK_RECORD')
			) {
				record = { type: value, tags: [] };
			}
		} else if (record) record.tags.push([code, value]);
	}
	if (record) records.push(record);
	const model = records.find(r =>
		r.type === 'BLOCK_RECORD'
		&& r.tags.some(([code, value]) => code === 2 && value.toUpperCase() === '*MODEL_SPACE')
	);
	const modelHandle = model?.tags.find(([code]) => code === 5)?.[1];
	if (!modelHandle) return;
	const candidates = records.filter(r => r.type === 'GEODATA').map(r => {
		const subclass = r.tags.findIndex(([code, value]) =>
			code === 100 && value === 'AcDbGeoData'
		);
		return subclass < 0 ? [] : r.tags.slice(subclass + 1);
	}).filter(tags =>
		tags.find(([code]) => code === 330)?.[1].toUpperCase() === modelHandle.toUpperCase()
	);
	if (candidates.length !== 1) return;
	const tags = candidates[0];
	const number = (code: number, fallback = NaN) => {
		const value = tags.find(([c]) => c === code)?.[1];
		return value === undefined ? fallback : Number(value);
	};
	if (
		![2, 3].includes(number(90)) || number(70) !== 2 || number(95, 1) !== 1
		|| number(294, 0) !== 0
	) return;
	if (
		Math.abs(number(210, 0)) > 1e-9 || Math.abs(number(220, 0)) > 1e-9
		|| Math.abs(number(230, 1) - 1) > 1e-9
	) return;
	if (![number(210, 0), number(220, 0), number(230, 1), number(41)].every(Number.isFinite)) {
		return;
	}
	const scale = number(40);
	if (!Number.isFinite(scale) || scale <= 0 || Math.abs(number(41) - scale) > 1e-12) return;
	const xml = tags.filter(([code]) => code === 301 || code === 303).map(([, value]) => value)
		.join('').replace(/\\P/g, '\n');
	if (XMLValidator.validate(xml) !== true) return;
	try {
		const data = new XMLParser({
			ignoreAttributes: false,
			processEntities: false,
			parseAttributeValue: false
		}).parse(xml).Dictionary;
		const system = data?.ProjectedCoordinateSystem;
		if (!system || Array.isArray(system) || typeof system['@_id'] !== 'string') return;
		const aliases = Array.isArray(data.Alias) ? data.Alias : [data.Alias];
		const alias = aliases.find((
			item: { '@_type'?: string; ObjectId?: string; Namespace?: string; }
		) => item?.['@_type'] === 'CoordinateSystem' && item.ObjectId === system['@_id']
			&& item.Namespace === 'EPSG Code'
		);
		const epsg = alias?.['@_id'];
		if (typeof epsg !== 'string' || !isValidEpsg(epsg)) return;
		const info = getEpsgInfo(epsg);
		if (!info.projection_method || !/\+units=m(?:\s|$)/.test(info.proj_context)) return;
		return { epsg, metersPerUnit: scale };
	} catch {
		return;
	}
};
