import type { FeatureCollection } from '$routes/map/types/geojson';

export interface S57Result {
	geojson: FeatureCollection;
	metadata: {
		name: string;
		edition: string;
		updateNumber: string;
		issueDate: string;
		scale: number;
		depthUnit: number;
		soundingDatum: number;
	};
	classes: { code: number; acronym: string; name: string; count: number; }[];
	omittedNonSpatialCount: number;
	warnings: string[];
}

import type { Feature } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import { attribute, objectClass } from './catalog';
import { formatS57 } from './definition';
import { type Coordinate, geometryBuilder, type Pointer, type Spatial } from './geometry';
import { fieldReader, type Fields, readDefinitions, readRecords, stripTerminator } from './iso8211';

const fail = (message: string): never => {
	throw new Error(`S-57の${message}`);
};
const single = (fields: Fields, tag: string) => {
	const values = fields.get(tag);
	if (!values) return undefined;
	if (values.length !== 1) fail(`${tag}フィールドが重複しています`);
	return fieldReader(stripTerminator(values[0]));
};
const longName = (agency: number, id: number, subdivision: number) =>
	agency.toString(16).padStart(4, '0') + id.toString(16).padStart(8, '0')
	+ subdivision.toString(16).padStart(4, '0');
const readPointers = (fields: Fields, tag: 'FSPT' | 'VRPT'): Pointer[] => {
	const result: Pointer[] = [];
	for (const field of fields.get(tag) ?? []) {
		const reader = fieldReader(stripTerminator(field));
		while (reader.remaining()) {
			const kind = reader.u8();
			const id = reader.u32();
			const orientation = reader.u8();
			const usage = reader.u8();
			const topology = tag === 'VRPT' ? reader.u8() : 255;
			reader.u8(); // MASK: S-52の境界線表示は再現しない。
			result.push({ key: `${kind}:${id}`, orientation, usage, topology });
		}
	}
	return result;
};

/** S-57 3.1のバイナリENC基本セルをWGS84のGeoJSONへ変換する。 */
export const parseS57 = (bytes: Uint8Array): S57Result => {
	const limits = formatS57.limits;
	if (bytes.byteLength > limits.maxFileBytes) fail('入力は64 MiBの上限を超えています');
	const metadata: S57Result['metadata'] = {
		name: '',
		edition: '',
		updateNumber: '',
		issueDate: '',
		scale: 0,
		depthUnit: 0,
		soundingDatum: 0
	};
	let definitions = new Set<string>();
	let hasDsid = false;
	let hasDssi = false;
	let hasDspm = false;
	let coordinateFactor = 0;
	let soundingFactor = 0;
	let asciiLevel = 0;
	let nationalLevel = 0;
	let inputVertices = 0;
	const spatial = new Map<string, Spatial>();
	const featureRecords: { primitive: number; properties: FeatureProp; pointers: Pointer[]; }[] =
		[];
	const featureIds = new Set<number>();
	const attributes = (fields: Fields, properties: FeatureProp) => {
		for (const tag of ['ATTF', 'NATF']) {
			const level = tag === 'NATF' ? nationalLevel : asciiLevel;
			for (const field of fields.get(tag) ?? []) {
				const reader = fieldReader(stripTerminator(field, level === 2));
				while (reader.remaining()) {
					const code = reader.u16();
					const [name, value] = attribute(code, reader.text(undefined, level));
					properties[name] = value;
				}
			}
		}
	};
	readRecords(bytes, (fields, ddr) => {
		if (ddr) {
			definitions = readDefinitions(fields);
			return;
		}
		for (const tag of fields.keys()) {
			if (['ARCC', 'CT2D', 'EL2D', 'C2IL', 'SGCC', 'VRPC', 'FSPC', 'FFPC'].includes(tag)) {
				fail('曲線または更新レコードは未対応です');
			}
			if (tag !== '0001' && !definitions.has(tag)) fail(`${tag}フィールドは未対応です`);
		}
		const dsid = single(fields, 'DSID');
		if (dsid) {
			if (hasDsid) fail('DSIDが重複しています');
			hasDsid = true;
			if (dsid.u8() !== 10) fail('DSIDが不正です');
			dsid.u32();
			if (dsid.u8() !== 1) fail('更新ファイルは未対応です');
			dsid.u8();
			metadata.name = dsid.text();
			metadata.edition = dsid.text();
			metadata.updateNumber = dsid.text();
			dsid.text(8);
			metadata.issueDate = dsid.text(8);
			const standard = dsid.text(4);
			const product = dsid.u8();
			dsid.text();
			dsid.text();
			const profile = dsid.u8();
			dsid.u16();
			dsid.text();
			dsid.end();
			if (standard.trim() !== '03.1' || product !== 1 || profile !== 1) {
				fail('S-57 3.1 ENC基本セル以外の製品仕様は未対応です');
			}
		}
		const dssi = single(fields, 'DSSI');
		if (dssi) {
			if (hasDssi) fail('DSSIが重複しています');
			hasDssi = true;
			if (dssi.u8() !== 3) fail('Planar graph以外の構造は未対応です');
			asciiLevel = dssi.u8();
			nationalLevel = dssi.u8();
			if (asciiLevel > 1 || nationalLevel > 2) fail('文字コードは未対応です');
			for (let i = 0; i < 8; i++) dssi.u32();
			dssi.end();
		}
		const dspm = single(fields, 'DSPM');
		if (dspm) {
			if (hasDspm) fail('DSPMが重複しています');
			hasDspm = true;
			if (dspm.u8() !== 20) fail('DSPMが不正です');
			dspm.u32();
			if (dspm.u8() !== 2) fail('WGS84以外の測地系は未対応です');
			dspm.u8();
			metadata.soundingDatum = dspm.u8();
			metadata.scale = dspm.u32();
			metadata.depthUnit = dspm.u8();
			dspm.u8();
			dspm.u8();
			if (dspm.u8() !== 1) fail('経緯度以外の座標単位は未対応です');
			coordinateFactor = dspm.u32();
			soundingFactor = dspm.u32();
			if (!coordinateFactor || !soundingFactor) fail('座標・測深倍率が不正です');
			dspm.text();
			dspm.end();
		}
		const vrid = single(fields, 'VRID');
		const frid = single(fields, 'FRID');
		if (!vrid && !frid) return;
		if (vrid && frid) fail('空間・地物レコードの混在は未対応です');
		if (!hasDsid || !hasDssi || !hasDspm) fail('データセット情報が欠損しています');
		if (vrid) {
			const kind = vrid.u8();
			const id = vrid.u32();
			vrid.u16();
			if (vrid.u8() !== 1) fail('更新ファイルは未対応です');
			vrid.end();
			if (![110, 120, 130].includes(kind)) fail('空間レコード種別は未対応です');
			const key = `${kind}:${id}`;
			if (spatial.has(key)) fail('空間レコードの識別子が重複しています');
			if (fields.has('SG2D') && fields.has('SG3D')) fail('2D・3D座標の混在は未対応です');
			const points: Coordinate[] = [];
			for (const tag of ['SG2D', 'SG3D']) {
				for (const field of fields.get(tag) ?? []) {
					const reader = fieldReader(stripTerminator(field));
					while (reader.remaining()) {
						const latitude = reader.i32() / coordinateFactor;
						const longitude = reader.i32() / coordinateFactor;
						if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
							fail('経緯度が範囲外です');
						}
						if (++inputVertices > limits.maxVertices) {
							fail('入力頂点数が上限を超えています');
						}
						points.push(
							tag === 'SG3D'
								? [longitude, latitude, reader.i32() / soundingFactor]
								: [longitude, latitude]
						);
					}
				}
			}
			spatial.set(key, { kind, points, pointers: readPointers(fields, 'VRPT') });
		}
		if (frid) {
			if (frid.u8() !== 100) fail('FRIDが不正です');
			const id = frid.u32();
			const primitive = frid.u8();
			const group = frid.u8();
			const code = frid.u16();
			const version = frid.u16();
			if (frid.u8() !== 1) fail('更新ファイルは未対応です');
			frid.end();
			if (![1, 2, 3, 255].includes(primitive)) fail('図形種別は未対応です');
			if (featureIds.has(id)) fail('地物の識別子が重複しています');
			featureIds.add(id);
			if (featureIds.size > limits.maxFeatures) fail('地物数が上限を超えています');
			const classification = objectClass(code);
			const properties: FeatureProp = {};
			attributes(fields, properties);
			Object.assign(properties, {
				RCID: id,
				PRIM: primitive,
				GRUP: group,
				OBJL: code,
				OBJL_NAME: classification.acronym,
				OBJL_DESCRIPTION: classification.name,
				RVER: version
			});
			const foid = single(fields, 'FOID');
			if (foid) {
				const agency = foid.u16();
				const identifier = foid.u32();
				const subdivision = foid.u16();
				foid.end();
				Object.assign(properties, {
					AGEN: agency,
					FIDN: identifier,
					FIDS: subdivision,
					LNAM: longName(agency, identifier, subdivision)
				});
			}
			const relations: { LNAM: string; RIND: number; COMT: string; }[] = [];
			for (const field of fields.get('FFPT') ?? []) {
				const reader = fieldReader(stripTerminator(field));
				while (reader.remaining()) {
					const name = longName(reader.u16(), reader.u32(), reader.u16());
					relations.push({ LNAM: name, RIND: reader.u8(), COMT: reader.text() });
				}
			}
			if (relations.length) properties.FFPT = JSON.stringify(relations);
			featureRecords.push({ primitive, properties, pointers: readPointers(fields, 'FSPT') });
		}
	});
	if (!hasDsid || !hasDssi || !hasDspm) fail('データセット情報が欠損しています');
	let outputVertices = 0;
	const builder = geometryBuilder(spatial, count => {
		outputVertices += count;
		if (outputVertices > limits.maxVertices) fail('出力頂点数が上限を超えています');
	});
	const features: Feature[] = [];
	let omittedNonSpatialCount = 0;
	let outputBytes = 42;
	const classes = new Map<number, S57Result['classes'][number]>();
	const append = (geometry: Feature['geometry'], properties: FeatureProp) => {
		const feature: Feature = { type: 'Feature', geometry, properties };
		if (features.length >= limits.maxFeatures) fail('出力地物数が上限を超えています');
		outputBytes += new TextEncoder().encode(JSON.stringify(feature)).byteLength + 1;
		if (outputBytes > limits.maxOutputBytes) fail('出力は128 MiBの上限を超えています');
		features.push(feature);
		const code = Number(properties.OBJL);
		const item = classes.get(code) ?? { code, ...objectClass(code), count: 0 };
		item.count++;
		classes.set(code, item);
	};
	for (const { primitive, properties, pointers } of featureRecords) {
		if (primitive === 255) {
			omittedNonSpatialCount++;
			continue;
		}
		if (!pointers.length) fail('地物の空間参照が欠損しています');
		if (primitive === 1) {
			for (const [longitude, latitude, depth] of builder.points(pointers)) {
				append(
					{ type: 'Point', coordinates: [longitude, latitude] },
					depth === undefined
						? { ...properties }
						: {
							...properties,
							DEPTH: depth,
							DEPTH_UNIT: metadata.depthUnit,
							SOUNDING_DATUM: metadata.soundingDatum
						}
				);
			}
		} else append(builder.shape(primitive, pointers), properties);
	}
	return {
		geojson: { type: 'FeatureCollection', features },
		metadata,
		classes: [...classes.values()].sort((a, b) => a.code - b.code),
		omittedNonSpatialCount,
		warnings: []
	};
};
