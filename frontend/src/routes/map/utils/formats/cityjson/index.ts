import type { MultiPolygon3DFeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import { getProjContext, isValidEpsg } from '$routes/map/utils/proj/dict';
import { ensureProjNadgridsReady } from '$routes/map/utils/proj/nadgrid';
import proj4 from 'proj4';

type JsonObject = Record<string, unknown>;
type Position = [number, number, number];
type Polygon = Position[][];
export interface CityJsonOptions {
	/** metadata.referenceSystem がない、または未登録の場合の水平座標系。 */
	crs?: string;
}
export interface CityJsonResult {
	geojson: MultiPolygon3DFeatureCollection;
	bounds: [number, number, number, number];
	polygonCount: number;
	skippedGeometryCount: number;
	hasAppearance: boolean;
}
const object = (value: unknown, label: string): JsonObject => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${label}がオブジェクトではありません`);
	}
	return value as JsonObject;
};
const array = (value: unknown, label: string): unknown[] => {
	if (!Array.isArray(value)) throw new Error(`${label}が配列ではありません`);
	return value;
};
const position = (value: unknown, label: string): Position => {
	const values = array(value, label);
	if (values.length !== 3 || !values.every(v => typeof v === 'number' && Number.isFinite(v))) {
		throw new Error(`${label}には有限のXYZ座標が必要です`);
	}
	return values as Position;
};
const lookup = (values: unknown[], index: unknown, label: string) => {
	if (
		typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= values.length
	) {
		throw new Error(`${label}の参照番号が範囲外です: ${String(index)}`);
	}
	return values[index];
};

/** EPSGの軸宣言によらずCityJSONのX/Y（東/北）順を使い、標高は変えない。 */
export const resolveCityJsonCrs = (reference: unknown): string => {
	if (typeof reference !== 'string' || !reference.trim()) {
		throw new Error('座標系が記録されていません。水平座標系を指定してください。');
	}
	const crs = reference.trim();
	if (crs.startsWith('+proj=')) return crs;
	if (/^(?:https?:\/\/www\.opengis\.net\/def\/crs\/OGC\/[^/]+\/)?CRS84h?$/i.test(crs)) {
		return 'EPSG:4326';
	}
	const code = crs.match(
		/^(?:EPSG:|urn:ogc:def:crs:EPSG::|https?:\/\/www\.opengis\.net\/def\/crs\/EPSG\/[^/]+\/)?(\d+)$/i
	)?.[1];
	if (code === '4979') return 'EPSG:4326';
	if (code === '6697') return getProjContext('6668');
	if (code && isValidEpsg(code)) return getProjContext(code);
	// WGS84 / UTMはゾーン番号から定義できる。
	if (code && /^(326|327)(0[1-9]|[1-5]\d|60)$/.test(code)) {
		return `+proj=utm +zone=${Number(code.slice(3))}${
			code.startsWith('327') ? ' +south' : ''
		} +datum=WGS84 +units=m +no_defs`;
	}
	throw new Error(`未対応の座標系です: ${crs}。水平座標系のPROJ文字列を指定してください。`);
};

const surfaceDepth: Record<string, number> = {
	MultiSurface: 1,
	CompositeSurface: 1,
	Solid: 2,
	MultiSolid: 3,
	CompositeSolid: 3
};
const flattenSurfaces = (boundaries: unknown, depth: number): unknown[] => {
	const values = array(boundaries, 'boundaries');
	return depth === 1 ? values : values.flatMap(value => flattenSurfaces(value, depth - 1));
};
const lodNumber = (geometry: JsonObject): number => {
	const value = geometry.lod;
	if (
		(typeof value !== 'string' && typeof value !== 'number')
		|| !/^\d+(?:\.\d+)?$/.test(String(value))
	) {
		throw new Error('geometry.lodにはLODの数値が必要です');
	}
	const lod = Number(value);
	if (!Number.isFinite(lod)) throw new Error('geometry.lodが不正です');
	return lod;
};

export const cityJsonTextToGeoJson = async (
	text: string,
	options: CityJsonOptions = {}
): Promise<CityJsonResult> => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
	} catch {
		throw new Error('CityJSONをJSONとして読み取れませんでした');
	}
	const root = object(parsed, 'CityJSON');
	if (root.type !== 'CityJSON') throw new Error('typeがCityJSONではありません');
	if (!['1.0', '1.1', '2.0'].includes(String(root.version))) {
		throw new Error(`未対応のCityJSONバージョンです: ${String(root.version)}`);
	}
	const objects = object(root.CityObjects, 'CityObjects');
	const vertices = array(root.vertices, 'vertices');
	let scale: Position = [1, 1, 1];
	let translate: Position = [0, 0, 0];
	if (root.transform !== undefined) {
		const transform = object(root.transform, 'transform');
		scale = position(transform.scale, 'transform.scale');
		translate = position(transform.translate, 'transform.translate');
		if (scale.some(v => v <= 0)) throw new Error('transform.scaleには正の値が必要です');
	} else if (root.version !== '1.0') {
		throw new Error('CityJSON 1.1 / 2.0にはtransformが必要です');
	}
	const metadata = root.metadata === undefined ? {} : object(root.metadata, 'metadata');
	const crs = resolveCityJsonCrs(options.crs?.trim() || metadata.referenceSystem);
	await ensureProjNadgridsReady(crs);
	let converter: proj4.Converter;
	try {
		converter = proj4(crs, 'EPSG:4326');
	} catch {
		throw new Error('水平座標系の定義を読み取れませんでした');
	}
	const worldVertex = (index: unknown): Position => {
		const v = position(lookup(vertices, index, 'vertices'), 'vertices');
		return [
			v[0] * scale[0] + translate[0],
			v[1] * scale[1] + translate[1],
			v[2] * scale[2] + translate[2]
		];
	};
	const project = (v: Position): Position => {
		const [x, y] = converter.forward([v[0], v[1]]);
		if (![x, y, v[2]].every(Number.isFinite) || Math.abs(x) > 180 || Math.abs(y) > 90) {
			throw new Error('座標変換結果が地図の範囲外です。水平座標系を確認してください。');
		}
		return [x, y, v[2]];
	};
	const projectedVertices = new Map<number, Position>();
	const vertex = (index: unknown): Position => {
		const cached = projectedVertices.get(index as number);
		if (cached) return cached;
		const v = project(worldVertex(index));
		projectedVertices.set(index as number, v);
		return v;
	};
	const templates = root['geometry-templates'] === undefined
		? null
		: object(root['geometry-templates'], 'geometry-templates');
	const expand = (
		geometry: JsonObject
	): { geometry: JsonObject; vertex: (index: unknown) => Position; } => {
		if (geometry.type !== 'GeometryInstance') return { geometry, vertex };
		if (!templates) throw new Error('GeometryInstanceのgeometry-templatesがありません');
		const template = object(
			lookup(array(templates.templates, 'templates'), geometry.template, 'templates'),
			'template'
		);
		if (template.type === 'GeometryInstance') {
			throw new Error('GeometryInstanceの入れ子には対応していません');
		}
		const anchors = array(geometry.boundaries, 'GeometryInstance.boundaries');
		if (anchors.length !== 1) throw new Error('GeometryInstanceの参照点は1つ必要です');
		const anchor = worldVertex(anchors[0]);
		const matrix = array(geometry.transformationMatrix, 'transformationMatrix');
		if (
			matrix.length !== 16 || !matrix.every(v => typeof v === 'number' && Number.isFinite(v))
		) throw new Error('transformationMatrixには16個の数値が必要です');
		const m = matrix as number[];
		if (m[12] !== 0 || m[13] !== 0 || m[14] !== 0 || m[15] !== 1) {
			throw new Error('アフィン変換以外のGeometryInstanceには対応していません');
		}
		const templateVertices = array(templates['vertices-templates'], 'vertices-templates');
		return {
			geometry: template,
			vertex: index => {
				const [x, y, z] = position(
					lookup(templateVertices, index, 'vertices-templates'),
					'vertices-templates'
				);
				// テンプレート自体にはroot.transformを適用しない。
				return project([
					m[0] * x + m[1] * y + m[2] * z + m[3] + anchor[0],
					m[4] * x + m[5] * y + m[6] * z + m[7] + anchor[1],
					m[8] * x + m[9] * y + m[10] * z + m[11] + anchor[2]
				]);
			}
		};
	};
	const result: CityJsonResult = {
		geojson: { type: 'FeatureCollection', features: [] },
		bounds: [Infinity, Infinity, -Infinity, -Infinity],
		polygonCount: 0,
		skippedGeometryCount: 0,
		hasAppearance: root.appearance !== undefined
	};
	for (const [id, value] of Object.entries(objects)) {
		try {
			const cityObject = object(value, `CityObjects.${id}`);
			const geometries = array(cityObject.geometry ?? [], 'geometry').map(g =>
				expand(object(g, 'geometry'))
			);
			if (!geometries.length) continue; // Building / CityObjectGroup等の親だけのオブジェクト。
			const lods = geometries.map(g => lodNumber(g.geometry));
			const highest = lods.reduce((max, lod) => Math.max(max, lod), -Infinity);
			const polygons: Polygon[] = [];
			for (const [index, item] of geometries.entries()) {
				if (lods[index] !== highest) continue;
				const geometryType = String(item.geometry.type);
				const depth = Object.hasOwn(surfaceDepth, geometryType)
					? surfaceDepth[geometryType]
					: undefined;
				if (!depth) {
					result.skippedGeometryCount++;
					continue;
				}
				for (const surface of flattenSurfaces(item.geometry.boundaries, depth)) {
					const rings = array(surface, 'surface').map(ring => {
						const points = array(ring, 'ring').map(item.vertex);
						if (new Set(points.map(p => p.join(','))).size < 3) {
							throw new Error('面のリングには異なる3頂点以上が必要です');
						}
						if (!points[0].every((v, axis) => v === points[points.length - 1][axis])) {
							points.push([...points[0]]);
						}
						return points;
					});
					if (!rings.length) throw new Error('面の外周がありません');
					polygons.push(rings);
				}
			}
			if (!polygons.length) continue;
			const attributes = object(cityObject.attributes ?? {}, 'attributes');
			const properties: FeatureProp = Object.fromEntries(
				Object.entries(attributes).map(([key, value]) => [
					key,
					typeof value === 'string' || typeof value === 'number'
						|| typeof value === 'boolean'
						? value
						: JSON.stringify(value)
				])
			);
			// 形式側の識別情報とユーザー属性のキーを衝突させない。
			properties['cityjson:id'] = id;
			properties['cityjson:type'] = String(cityObject.type);
			properties['cityjson:lod'] = highest;
			if (cityObject.parents) {
				properties['cityjson:parents'] = JSON.stringify(cityObject.parents);
			}
			if (cityObject.children) {
				properties['cityjson:children'] = JSON.stringify(cityObject.children);
			}
			result.geojson.features.push({
				type: 'Feature',
				id,
				properties,
				geometry: { type: 'MultiPolygon', coordinates: polygons }
			});
			result.polygonCount += polygons.length;
			for (const polygon of polygons) {
				for (const ring of polygon) {
					for (const [x, y] of ring) {
						result.bounds[0] = Math.min(result.bounds[0], x);
						result.bounds[1] = Math.min(result.bounds[1], y);
						result.bounds[2] = Math.max(result.bounds[2], x);
						result.bounds[3] = Math.max(result.bounds[3], y);
					}
				}
			}
		} catch (error) {
			throw new Error(`${id}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	if (!result.geojson.features.length) {
		throw new Error('表示できる面がありません。CityJSONの面・立体形状が対象です。');
	}
	return result;
};
