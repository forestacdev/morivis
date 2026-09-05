import { type EpsgCode, getProjContext } from '$routes/map/utils/proj/dict';
import { configureIfcWasmPath } from '$routes/map/utils/three/ifc-wasm-path';
import proj4 from 'proj4';

// IFC georeferencing helper for future use.
// Spec references:
// IfcSite:
// https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/lexical/IfcSite.htm
// IfcProjectedCRS:
// https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/lexical/IfcProjectedCRS.htm
// IfcMapConversion:
// https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD1/HTML/schema/ifcrepresentationresource/lexical/ifcmapconversion.htm

export type IfcPlacementQuality = 'exact' | 'requires_epsg' | 'approximate' | 'normalized';
export type IfcCoordinateMode = 'absolute' | 'local' | 'unknown';

export interface IfcHeaderMetadata {
	description?: string;
}

export interface IfcPlacementMetadata extends IfcHeaderMetadata {
	lng?: number;
	lat?: number;
	altitude?: number;
	unitScale?: number;
	baseRotationZ?: number;
	requiresEpsg?: boolean;
	placementQuality?: IfcPlacementQuality;
	coordinateMode?: IfcCoordinateMode;
	missingRequirements?: string[];
	eastings?: number;
	northings?: number;
	orthogonalHeight?: number;
	xAxisAbscissa?: number;
	xAxisOrdinate?: number;
}

export const hasIfcGeographicCoordinates = (metadata: IfcPlacementMetadata | undefined) =>
	Number.isFinite(metadata?.lng) && Number.isFinite(metadata?.lat);

/** IfcSite の緯度経度だけではモデル座標を厳密に地図へ変換できない。 */
export const hasIfcExactGeoreference = (metadata: IfcPlacementMetadata | undefined) =>
	metadata?.placementQuality === 'exact' && hasIfcGeographicCoordinates(metadata);

/** IFC の地理配置を確定できない場合も、地図上の任意位置へ自動登録しない。 */
export const getIfcPlacementCoordinateMode = (
	metadata: IfcPlacementMetadata | undefined
): 'local' | 'projected' => {
	if (metadata?.requiresEpsg || metadata?.coordinateMode === 'absolute') return 'projected';
	return 'local';
};

let ifcLoaderModulePromise: Promise<typeof import('web-ifc-three/IFCLoader.js')> | null = null;
let webIfcModulePromise: Promise<typeof import('web-ifc')> | null = null;

const loadIfcLoaderModule = async () => {
	if (!ifcLoaderModulePromise) {
		ifcLoaderModulePromise = import('web-ifc-three/IFCLoader.js');
	}
	return ifcLoaderModulePromise;
};

const loadWebIfcModule = async () => {
	if (!webIfcModulePromise) {
		webIfcModulePromise = import('web-ifc');
	}
	return webIfcModulePromise;
};

const unwrapIfcValue = (value: unknown): any => {
	if (value && typeof value === 'object' && 'value' in value) {
		return unwrapIfcValue((value as { value: unknown; }).value);
	}
	return value;
};

const splitIfcHeaderArguments = (value: string) => {
	const argumentsList: string[] = [];
	let start = 0;
	let depth = 0;
	let inString = false;
	for (let index = 0; index < value.length; index += 1) {
		const character = value[index];
		if (character === "'") {
			if (inString && value[index + 1] === "'") {
				index += 1;
				continue;
			}
			inString = !inString;
			continue;
		}
		if (inString) continue;
		if (character === '(') depth += 1;
		if (character === ')') depth -= 1;
		if (character === ',' && depth === 0) {
			argumentsList.push(value.slice(start, index).trim());
			start = index + 1;
		}
	}
	argumentsList.push(value.slice(start).trim());
	return argumentsList;
};

const parseIfcHeaderString = (value: string | undefined) => {
	if (!value || value === '$') return undefined;
	const match = value.match(/^'([\s\S]*)'$/);
	return match?.[1].replaceAll("''", "'") || undefined;
};

/** STEP の FILE_NAME ヘッダーから、出力時に記録されたソフトウェア情報を説明文にする。 */
export const parseIfcHeaderMetadata = (content: string): IfcHeaderMetadata => {
	const match = content.match(/FILE_NAME\s*\(([\s\S]*?)\)\s*;/i);
	if (!match) return {};
	const values = splitIfcHeaderArguments(match[1]);
	const applicationName = parseIfcHeaderString(values[5]);
	return {
		...(applicationName && { description: `IFCファイル。作成元ソフト: ${applicationName}。` })
	};
};

export const getIfcCoordinateMode = (content: string): IfcCoordinateMode => {
	const matches = content.matchAll(
		/IFCCARTESIANPOINT\s*\(\s*\(\s*([-+\d.E]+)\s*,\s*([-+\d.E]+)/gi
	);
	let count = 0;
	let absoluteCount = 0;
	for (const match of matches) {
		const x = Number(match[1]);
		const y = Number(match[2]);
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
		count += 1;
		if (Math.abs(x) > 1000 || Math.abs(y) > 1000) absoluteCount += 1;
	}
	if (count === 0) return 'unknown';
	return absoluteCount / count >= 0.5 ? 'absolute' : 'local';
};

const parseIfcAngleComponents = (value: string | undefined) => {
	if (!value || value === '$') return undefined;
	const match = value.trim().match(/^\(([\s\S]*)\)$/);
	if (!match) return undefined;
	return parseAngleComponentList(splitIfcHeaderArguments(match[1]));
};

/** IFC の先頭付近にある IFCSITE は、WASM を初期化せずに位置情報を読める。 */
export const parseIfcSitePlacementMetadata = (content: string): Pick<
	IfcPlacementMetadata,
	'lng' | 'lat' | 'altitude'
> => {
	const match = content.match(/IFCSITE\s*\(([\s\S]*?)\)\s*;/i);
	if (!match) return {};

	const values = splitIfcHeaderArguments(match[1]);
	const lat = parseIfcAngleComponents(values[9]);
	const lng = parseIfcAngleComponents(values[10]);
	const altitude = Number(values[11]);
	if (!Number.isFinite(lng) || !Number.isFinite(lat)) return {};

	return {
		lng,
		lat,
		...(Number.isFinite(altitude) && { altitude })
	};
};

const createIfcFallbackPlacementMetadata = (
	headerMetadata: IfcHeaderMetadata,
	coordinateMode: IfcCoordinateMode,
	sitePlacement: Pick<IfcPlacementMetadata, 'lng' | 'lat' | 'altitude'>
): IfcPlacementMetadata => ({
	...headerMetadata,
	...sitePlacement,
	coordinateMode,
	...(hasIfcGeographicCoordinates(sitePlacement)
		? {
			placementQuality: 'approximate' as const,
			missingRequirements: ['IfcProjectedCRS', 'IfcMapConversion']
		}
		: coordinateMode === 'absolute'
			? {
				requiresEpsg: true,
				placementQuality: 'requires_epsg' as const,
				missingRequirements: ['IfcProjectedCRS', 'IfcMapConversion']
			}
			: {
				placementQuality: 'normalized' as const,
				missingRequirements: ['IfcSite', 'IfcProjectedCRS', 'IfcMapConversion']
			})
});

const readIfcQuickMetadata = async (file: File) => {
	const content = await file.slice(0, 1024 * 1024).text();
	return {
		headerMetadata: parseIfcHeaderMetadata(content),
		coordinateMode: getIfcCoordinateMode(content),
		sitePlacement: parseIfcSitePlacementMetadata(content)
	};
};

const resolveIfcEntity = async (model: any, value: unknown) => {
	const unwrapped = unwrapIfcValue(value);
	if (typeof unwrapped === 'number') {
		return model.getItemProperties(unwrapped, false);
	}
	return unwrapped;
};

const parseAngleComponentList = (value: unknown) => {
	const list = Array.isArray(value) ? value.map((item) => Number(unwrapIfcValue(item) ?? 0)) : [];
	if (list.length === 0 || Number.isNaN(list[0])) return undefined;
	const sign = list[0] < 0 ? -1 : 1;
	const absValues = list.map((item) => Math.abs(item));
	const degrees = absValues[0] ?? 0;
	const minutes = absValues[1] ?? 0;
	const seconds = absValues[2] ?? 0;
	const millionths = absValues[3] ?? 0;
	return sign * (degrees + minutes / 60 + seconds / 3600 + millionths / 3_600_000_000);
};

const parseLengthUnitScale = async (model: any, project: any) => {
	const unitsInContext = await resolveIfcEntity(model, project?.UnitsInContext);
	const units = Array.isArray(unitsInContext?.Units) ? unitsInContext.Units : [];
	for (const unitRef of units) {
		const unit = await resolveIfcEntity(model, unitRef);
		const unitType = String(unwrapIfcValue(unit?.UnitType) ?? '');
		if (!unitType.includes('LENGTHUNIT')) continue;

		if (unit?.Name != null) {
			const name = String(unwrapIfcValue(unit.Name) ?? '').toUpperCase();
			const prefix = String(unwrapIfcValue(unit.Prefix) ?? '').toUpperCase();
			if (name.includes('METRE')) {
				if (prefix.includes('MILLI')) return 0.001;
				if (prefix.includes('CENTI')) return 0.01;
				if (prefix.includes('DECI')) return 0.1;
				if (prefix.includes('KILO')) return 1000;
				return 1;
			}
		}

		const conversionFactor = await resolveIfcEntity(model, unit?.ConversionFactor);
		const valueComponent = Number(
			unwrapIfcValue(
				conversionFactor?.ValueComponent?.value ?? conversionFactor?.ValueComponent
			)
		);
		if (Number.isFinite(valueComponent) && valueComponent > 0) {
			return valueComponent;
		}
	}

	return 1;
};

const parseProjectedCrsName = (projectedCrs: any) => {
	const candidates = [
		projectedCrs?.Name,
		projectedCrs?.Description,
		projectedCrs?.MapProjection,
		projectedCrs?.MapZone
	]
		.map((value) => String(unwrapIfcValue(value) ?? '').trim())
		.filter(Boolean);

	for (const candidate of candidates) {
		const epsgMatch = candidate.match(/EPSG[:\s-]*(\d{4,5})/i);
		if (epsgMatch) return `EPSG:${epsgMatch[1]}`;
		if (/^\d{4,5}$/.test(candidate)) return `EPSG:${candidate}`;
	}

	return null;
};

const ensureProj4Definition = (epsg: EpsgCode | string) => {
	const code = String(epsg).replace(/^EPSG:/i, '') as EpsgCode;
	const epsgName = `EPSG:${code}`;
	if (proj4.defs(epsgName)) return epsgName;
	proj4.defs(epsgName, getProjContext(code));
	return epsgName;
};

const parseMapConversionPlacement = async (model: any, mapConversion: any) => {
	const projectedCrs = await resolveIfcEntity(model, mapConversion?.TargetCRS);
	const crsName = parseProjectedCrsName(projectedCrs);
	const eastings = Number(unwrapIfcValue(mapConversion?.Eastings));
	const northings = Number(unwrapIfcValue(mapConversion?.Northings));
	const orthogonalHeight = Number(unwrapIfcValue(mapConversion?.OrthogonalHeight) ?? 0);
	if (!Number.isFinite(eastings) || !Number.isFinite(northings)) return {};
	const xAxisAbscissa = Number(unwrapIfcValue(mapConversion?.XAxisAbscissa) ?? 1);
	const xAxisOrdinate = Number(unwrapIfcValue(mapConversion?.XAxisOrdinate) ?? 0);

	if (!crsName) {
		return {
			requiresEpsg: true,
			placementQuality: 'requires_epsg' as const,
			missingRequirements: ['IfcProjectedCRS.Name'],
			eastings,
			northings,
			orthogonalHeight: Number.isFinite(orthogonalHeight) ? orthogonalHeight : 0,
			xAxisAbscissa: Number.isFinite(xAxisAbscissa) ? xAxisAbscissa : 1,
			xAxisOrdinate: Number.isFinite(xAxisOrdinate) ? xAxisOrdinate : 0
		};
	}

	try {
		const [lng, lat] = proj4(ensureProj4Definition(crsName), 'EPSG:4326', [
			eastings,
			northings
		]) as [number, number];
		const baseRotationZ = Number.isFinite(xAxisAbscissa) && Number.isFinite(xAxisOrdinate)
			? (Math.atan2(xAxisOrdinate, xAxisAbscissa) * 180) / Math.PI
			: undefined;

		return {
			lng,
			lat,
			altitude: Number.isFinite(orthogonalHeight) ? orthogonalHeight : 0,
			baseRotationZ,
			placementQuality: 'exact' as const
		};
	} catch {
		return {};
	}
};

export const resolveIfcPlacementWithEpsg = (
	metadata: IfcPlacementMetadata,
	epsg: EpsgCode
): IfcPlacementMetadata => {
	if (metadata.eastings == null || metadata.northings == null) return metadata;
	try {
		const [lng, lat] = proj4(ensureProj4Definition(epsg), 'EPSG:4326', [
			metadata.eastings,
			metadata.northings
		]) as [number, number];
		const baseRotationZ = metadata.xAxisAbscissa != null && metadata.xAxisOrdinate != null
			? (Math.atan2(metadata.xAxisOrdinate, metadata.xAxisAbscissa) * 180) / Math.PI
			: undefined;

		return {
			...metadata,
			requiresEpsg: false,
			placementQuality: 'exact',
			missingRequirements: [],
			lng,
			lat,
			altitude: metadata.orthogonalHeight,
			baseRotationZ
		};
	} catch {
		return metadata;
	}
};

export const readIfcPlacementMetadata = async (
	file: File
): Promise<IfcPlacementMetadata | undefined> => {
	const { headerMetadata, coordinateMode, sitePlacement } = await readIfcQuickMetadata(file);
	const fallbackPlacement = createIfcFallbackPlacementMetadata(
		headerMetadata,
		coordinateMode,
		sitePlacement
	);
	let model: any;

	try {
		const [{ IFCLoader }, webIfc] = await Promise.all([loadIfcLoaderModule(), loadWebIfcModule()]);
		const loader = new IFCLoader();
		await configureIfcWasmPath(loader.ifcManager);
		model = await loader.parse(await file.arrayBuffer());

		const projectIds = await model.getAllItemsOfType(webIfc.IFCPROJECT, false);
		const projectId = Array.isArray(projectIds) ? projectIds[0] : undefined;
		const project = projectId != null ? await model.getItemProperties(projectId, false) : null;
		const unitScale = project ? await parseLengthUnitScale(model, project) : 1;

		const mapConversionIds = await model.getAllItemsOfType(webIfc.IFCMAPCONVERSION, false);
		const mapConversionId = Array.isArray(mapConversionIds) ? mapConversionIds[0] : undefined;
		if (mapConversionId != null) {
			const mapConversion = await model.getItemProperties(mapConversionId, false);
			const placement = await parseMapConversionPlacement(model, mapConversion);
			return {
				...headerMetadata,
				...placement,
				unitScale
			};
		}

		const siteIds = await model.getAllItemsOfType(webIfc.IFCSITE, false);
		const siteId = Array.isArray(siteIds) ? siteIds[0] : undefined;
		if (siteId == null) {
			return {
				...headerMetadata,
				unitScale,
				coordinateMode,
				...(coordinateMode === 'absolute'
					? {
						requiresEpsg: true,
						placementQuality: 'requires_epsg' as const,
						missingRequirements: ['IfcProjectedCRS', 'IfcMapConversion']
					}
					: {
						placementQuality: 'normalized' as const,
						missingRequirements: ['IfcSite', 'IfcProjectedCRS', 'IfcMapConversion']
					})
			};
		}

		const site = await model.getItemProperties(siteId, false);
		const lat = parseAngleComponentList(site?.RefLatitude);
		const lng = parseAngleComponentList(site?.RefLongitude);
		const refElevation = Number(unwrapIfcValue(site?.RefElevation) ?? 0);
		const hasSiteCoordinates = Number.isFinite(lng) && Number.isFinite(lat);

		return {
			...headerMetadata,
			lng: hasSiteCoordinates ? lng : undefined,
			lat: hasSiteCoordinates ? lat : undefined,
			altitude: Number.isFinite(refElevation) ? refElevation * unitScale : undefined,
			unitScale,
			coordinateMode,
			...(hasSiteCoordinates
				? {
					placementQuality: 'approximate' as const,
					missingRequirements: ['IfcProjectedCRS', 'IfcMapConversion']
				}
				: coordinateMode === 'absolute'
				? {
					requiresEpsg: true,
					placementQuality: 'requires_epsg' as const,
					missingRequirements: ['IfcProjectedCRS', 'IfcMapConversion']
				}
				: {
					placementQuality: 'normalized' as const,
					missingRequirements: ['IfcSite', 'IfcProjectedCRS', 'IfcMapConversion']
				})
		};
	} catch {
		return fallbackPlacement;
	} finally {
		await model?.ifcManager?.dispose?.();
	}
};
