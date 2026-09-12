/**
 * CityGML 1.0/2.0の建物を、標高付きのGeoJSON MultiPolygonへ変換する。
 * 参照: https://github.com/Project-PLATEAU/PLATEAU-GIS-Converter/tree/main/nusamai/src/transformer
 * Solid / Surfaceを面群へ展開し、LOD選択と属性の平坦化を描画から分離する。
 */
import type { MultiPolygon3DFeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import { DOMParser } from '@xmldom/xmldom';
import { XMLValidator } from 'fast-xml-parser';
import { getChildElements } from '../gml/shared';

export type CityGmlLod = 'highest' | 0 | 1 | 2 | 3 | 4;
type Position3D = [number, number, number];
type Polygon3D = Position3D[][];

export interface CityGmlResult {
	geojson: MultiPolygon3DFeatureCollection;
	bounds: [number, number, number, number];
	polygonCount: number;
	skippedBuildingCount: number;
}

const GML_NAMESPACES = new Set(['http://www.opengis.net/gml', 'http://www.opengis.net/gml/3.2']);
const XLINK = 'http://www.w3.org/1999/xlink';
const isGml = (element: Element, name?: string) =>
	GML_NAMESPACES.has(element.namespaceURI ?? '') && (!name || element.localName === name);
const isBuilding = (element: Element) =>
	/^https?:\/\/www\.opengis\.net\/citygml\/building\/[12]\.0$/.test(element.namespaceURI ?? '')
	&& (element.localName === 'Building' || element.localName === 'BuildingPart');
const getId = (element: Element) =>
	element.getAttributeNS('http://www.opengis.net/gml', 'id')
	|| element.getAttributeNS('http://www.opengis.net/gml/3.2', 'id');

const inheritedAttribute = (element: Element, name: string): string | null => {
	let current: Element | null = element;
	while (current) {
		const value = current.getAttribute(name);
		if (value) return value;
		// Envelopeは座標要素の祖先ではなく、CityModel / Buildingの子に置かれる。
		if (isBuilding(current) || current.localName === 'CityModel') {
			const boundedBy = getChildElements(current).find((child) => isGml(child, 'boundedBy'));
			const envelope = boundedBy
				&& getChildElements(boundedBy).find((child) => isGml(child, 'Envelope'));
			const envelopeValue = envelope?.getAttribute(name);
			if (envelopeValue) return envelopeValue;
		}
		current = current.parentNode?.nodeType === 1 ? current.parentNode as Element : null;
	}
	return null;
};

const readNumbers = (element: Element): number[] => {
	const text = element.textContent?.trim();
	if (!text) throw new Error('CityGMLの座標が空です');
	const values = text.split(/\s+/).map(Number);
	if (values.some((value) => !Number.isFinite(value))) {
		throw new Error('CityGMLに数値でない座標が含まれています');
	}
	return values;
};

/** EPSGの緯度・経度順をGeoJSONの経度・緯度順へそろえる。標高は保持する。 */
const readPositions = (
	element: Element,
	defaultSrs: string | null,
	defaultDimension: string | null
): Position3D[] => {
	const srs = inheritedAttribute(element, 'srsName') ?? defaultSrs;
	if (!srs) throw new Error('CityGMLの座標参照系（srsName）が見つかりません');
	const epsg = /(?:EPSG(?::|\/|::).*?)(\d+)\s*$/i.exec(srs)?.[1];
	const longitudeFirst = /(?:CRS:?84|CRS84h)$/i.test(srs);
	if (!longitudeFirst && !['6697', '6668', '4326', '4979', '4612'].includes(epsg ?? '')) {
		throw new Error(
			`未対応のCityGML座標参照系です: ${srs}。経緯度座標のCityGMLを使用してください`
		);
	}
	const dimension = Number(inheritedAttribute(element, 'srsDimension') ?? defaultDimension ?? 3);
	if (dimension !== 3) throw new Error('CityGMLの3次元座標（srsDimension="3"）が必要です');
	const values = readNumbers(element);
	if (values.length % 3 !== 0 || (isGml(element, 'pos') && values.length !== 3)) {
		throw new Error('CityGMLの座標数が3次元の点列と一致しません');
	}
	const count = element.getAttribute('count');
	if (count && Number(count) * 3 !== values.length) {
		throw new Error('CityGMLのposListのcountと座標数が一致しません');
	}
	const positions: Position3D[] = [];
	for (let i = 0; i < values.length; i += 3) {
		const [lng, lat] = longitudeFirst ? [values[i], values[i + 1]] : [values[i + 1], values[i]];
		if (Math.abs(lng) > 180 || Math.abs(lat) > 85.05112878) {
			throw new Error('CityGMLの経緯度が地図に表示できる範囲を超えています');
		}
		positions.push([lng, lat, values[i + 2]]);
	}
	return positions;
};

const samePosition = (a: Position3D, b: Position3D) =>
	a.every((value, index) => value === b[index]);

const readRing = (
	ring: Element,
	defaultSrs: string | null,
	defaultDimension: string | null
): Position3D[] => {
	const children = getChildElements(ring);
	if (children.some((child) => !isGml(child, 'pos') && !isGml(child, 'posList'))) {
		throw new Error('CityGMLのLinearRingはposListまたはposによる点列に対応しています');
	}
	const positions = children.flatMap((child) =>
		readPositions(child, defaultSrs, defaultDimension)
	);
	if (positions.length < 4 || !samePosition(positions[0], positions[positions.length - 1])) {
		throw new Error('CityGMLのLinearRingが閉じていないか、頂点が不足しています');
	}
	if (new Set(positions.map((position) => position.join(','))).size < 3) {
		throw new Error('CityGMLの面を構成する頂点が不足しています');
	}
	return positions;
};

const getLod = (element: Element) => {
	if (!/^https?:\/\/www\.opengis\.net\/citygml\//.test(element.namespaceURI ?? '')) return null;
	const match = /^lod([0-4])(?:Solid|MultiSurface|Geometry|FootPrint|RoofEdge)$/.exec(
		element.localName
	);
	return match ? Number(match[1]) : null;
};

/** 建物属性をドット区切りで平坦化し、形状・子建物を属性へ混入させない。 */
const readProperties = (building: Element): FeatureProp => {
	const properties: FeatureProp = {};
	const visit = (element: Element, path: string) => {
		if (
			isBuilding(element) || getLod(element) !== null
			|| isGml(element) && element.localName !== 'name'
				&& element.localName !== 'description'
		) return;
		if (
			['boundedBy', 'consistsOfBuildingPart', 'appearance', 'address'].includes(
				element.localName
			)
		) return;
		const children = getChildElements(element);
		const name = element.getAttribute('name') || element.localName;
		const key = path ? `${path}.${name}` : name;
		if (children.length) {
			children.forEach((child) => visit(child, key));
		} else {
			const value = element.textContent?.trim();
			if (value) {
				Object.defineProperty(properties, key, {
					value: Object.hasOwn(properties, key) ? `${properties[key]}, ${value}` : value,
					enumerable: true,
					configurable: true,
					writable: true
				});
			}
		}
	};
	getChildElements(building).forEach((child) => visit(child, ''));
	return properties;
};

export const cityGmlTextToGeoJson = (text: string, lod: CityGmlLod = 'highest'): CityGmlResult => {
	if (lod !== 'highest' && ![0, 1, 2, 3, 4].includes(lod)) {
		throw new Error('CityGMLのLOD指定が不正です');
	}
	if (/<!DOCTYPE/i.test(text)) throw new Error('DOCTYPEを含むCityGMLには対応していません');
	const validation = XMLValidator.validate(text);
	if (validation !== true) throw new Error(`CityGMLのXMLが不正です: ${validation.err.msg}`);
	const doc = new DOMParser().parseFromString(text, 'text/xml') as unknown as Document;
	const root = doc.documentElement;
	if (
		!root || root.localName !== 'CityModel'
		|| !/^https?:\/\/www\.opengis\.net\/citygml\/[12]\.0$/.test(root.namespaceURI ?? '')
	) {
		throw new Error('CityGML 1.0 / 2.0のCityModelを読み込んでください');
	}
	const allElements = [root, ...Array.from(root.getElementsByTagName('*'))];
	const byId = new Map<string, Element>();
	for (const element of allElements) {
		const id = getId(element);
		if (id) {
			if (byId.has(id)) throw new Error(`CityGMLのgml:idが重複しています: ${id}`);
			byId.set(id, element);
		}
	}
	const envelope = getChildElements(root).find((element) => isGml(element, 'boundedBy'));
	const defaultEnvelope = envelope
		&& getChildElements(envelope).find((element) => isGml(element, 'Envelope'));
	const defaultSrs = defaultEnvelope?.getAttribute('srsName') || null;
	const defaultDimension = defaultEnvelope?.getAttribute('srsDimension') || null;
	const bounds: CityGmlResult['bounds'] = [Infinity, Infinity, -Infinity, -Infinity];
	const geojson: MultiPolygon3DFeatureCollection = { type: 'FeatureCollection', features: [] };
	let polygonCount = 0;
	let skippedBuildingCount = 0;
	let buildingCount = 0;

	const resolveReference = (element: Element): Element => {
		const href = element.getAttributeNS(XLINK, 'href');
		if (!href) return element;
		if (!href.startsWith('#')) {
			throw new Error(`CityGMLの外部参照には対応していません: ${href}`);
		}
		const target = byId.get(href.slice(1));
		if (!target) throw new Error(`CityGMLの参照先が見つかりません: ${href}`);
		if (target === element) throw new Error('CityGMLの形状参照が循環しています');
		return target;
	};

	const parsePolygon = (polygon: Element): Polygon3D => {
		const boundaries = getChildElements(polygon);
		const exterior = boundaries.filter((element) => isGml(element, 'exterior'));
		if (exterior.length !== 1) throw new Error('CityGMLのPolygonに外周がありません');
		return [...exterior, ...boundaries.filter((element) => isGml(element, 'interior'))].map(
			(boundary) => {
				const child = getChildElements(boundary)[0];
				if (!child) throw new Error('CityGMLの面にLinearRingがありません');
				const ring = resolveReference(child);
				if (!isGml(ring, 'LinearRing')) {
					throw new Error('CityGMLの面はLinearRingに対応しています');
				}
				return readRing(
					ring,
					inheritedAttribute(polygon, 'srsName') ?? defaultSrs,
					inheritedAttribute(polygon, 'srsDimension') ?? defaultDimension
				);
			}
		);
	};

	const visitBuilding = (building: Element, parentProperties: FeatureProp = {}) => {
		buildingCount++;
		const id = getId(building) || `building-${buildingCount}`;
		const candidates: Element[] = [];
		const parts: Element[] = [];
		const scan = (element: Element) => {
			if (isBuilding(element)) {
				parts.push(element);
				return;
			}
			if (getLod(element) !== null) {
				candidates.push(element);
				return;
			}
			getChildElements(element).forEach(scan);
		};
		getChildElements(building).forEach(scan);
		const selectedLod = lod === 'highest'
			? candidates.reduce((highest, element) => Math.max(highest, getLod(element)!), -1)
			: lod;
		const selected = candidates.filter((element) => getLod(element) === selectedLod);
		const solids = selected.filter((element) => element.localName.endsWith('Solid'));
		const polygons: Polygon3D[] = [];
		const visited = new Set<Element>();
		const active = new Set<Element>();
		const collect = (element: Element) => {
			if (element.localName === 'ImplicitGeometry') {
				throw new Error('CityGMLのImplicitGeometryには対応していません');
			}
			if (active.has(element)) throw new Error('CityGMLの形状参照が循環しています');
			if (visited.has(element)) return;
			active.add(element);
			const resolved = resolveReference(element);
			if (resolved !== element) collect(resolved);
			else if (isGml(element, 'Polygon') || isGml(element, 'Triangle')) {
				polygons.push(parsePolygon(element));
			} else getChildElements(element).forEach(collect);
			active.delete(element);
			visited.add(element);
		};
		(solids.length ? solids : selected).forEach(collect);
		const properties = { ...parentProperties, ...readProperties(building) };
		if (polygons.length) {
			geojson.features.push({
				type: 'Feature',
				id,
				geometry: { type: 'MultiPolygon', coordinates: polygons },
				properties: {
					...properties,
					gml_id: id,
					featureType: building.localName,
					lod: selectedLod
				}
			});
			polygonCount += polygons.length;
			for (const polygon of polygons) {
				for (const ring of polygon) {
					for (const [lng, lat] of ring) {
						bounds[0] = Math.min(bounds[0], lng);
						bounds[1] = Math.min(bounds[1], lat);
						bounds[2] = Math.max(bounds[2], lng);
						bounds[3] = Math.max(bounds[3], lat);
					}
				}
			}
		} else if (!parts.length) skippedBuildingCount++;
		// 親のSolidがある場合、構成部品を重ねて二重に描かない。
		if (!solids.length || !polygons.length) {
			parts.forEach((part) => visitBuilding(part, properties));
		}
	};
	for (const member of getChildElements(root)) {
		if (member.localName !== 'cityObjectMember') continue;
		const building = getChildElements(member)[0];
		if (building && isBuilding(building)) visitBuilding(building);
	}
	if (!geojson.features.length) {
		throw new Error(
			lod === 'highest'
				? 'CityGMLに読み込める建物の面形状がありません'
				: `LOD${lod}の建物の面形状がありません。別のLODを選択してください`
		);
	}
	return { geojson, bounds, polygonCount, skippedBuildingCount };
};
