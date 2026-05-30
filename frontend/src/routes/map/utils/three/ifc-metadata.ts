import { asset } from '$app/paths';
import proj4 from 'proj4';
import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';

const IFC_WASM_PATH = asset('/web-ifc/');
const IFC_DEBUG_PREFIX = '[IFC]';

export interface IfcPlacementMetadata {
	lng?: number;
	lat?: number;
	altitude?: number;
	unitScale?: number;
	baseRotationZ?: number;
	requiresEpsg?: boolean;
	eastings?: number;
	northings?: number;
	orthogonalHeight?: number;
	xAxisAbscissa?: number;
	xAxisOrdinate?: number;
}

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
		return unwrapIfcValue((value as { value: unknown }).value);
	}
	return value;
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
			unwrapIfcValue(conversionFactor?.ValueComponent?.value ?? conversionFactor?.ValueComponent)
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
		const baseRotationZ =
			Number.isFinite(xAxisAbscissa) && Number.isFinite(xAxisOrdinate)
				? (Math.atan2(xAxisOrdinate, xAxisAbscissa) * 180) / Math.PI
				: undefined;

		return {
			lng,
			lat,
			altitude: Number.isFinite(orthogonalHeight) ? orthogonalHeight : 0,
			baseRotationZ
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
		const baseRotationZ =
			metadata.xAxisAbscissa != null && metadata.xAxisOrdinate != null
				? (Math.atan2(metadata.xAxisOrdinate, metadata.xAxisAbscissa) * 180) / Math.PI
				: undefined;
		const resolved = {
			...metadata,
			requiresEpsg: false,
			lng,
			lat,
			altitude: metadata.orthogonalHeight,
			baseRotationZ
		};
		console.log(`${IFC_DEBUG_PREFIX} resolved placement with EPSG`, {
			epsg,
			eastings: metadata.eastings,
			northings: metadata.northings,
			resolved
		});
		return resolved;
	} catch {
		console.warn(`${IFC_DEBUG_PREFIX} failed to resolve placement with EPSG`, {
			epsg,
			eastings: metadata.eastings,
			northings: metadata.northings
		});
		return metadata;
	}
};

export const readIfcPlacementMetadata = async (file: File): Promise<IfcPlacementMetadata | undefined> => {
	const [{ IFCLoader }, webIfc] = await Promise.all([loadIfcLoaderModule(), loadWebIfcModule()]);
	const loader = new IFCLoader();
	await loader.ifcManager.setWasmPath(IFC_WASM_PATH);

	const buffer = await file.arrayBuffer();
	const model = await loader.parse(buffer);

	try {
		const projectIds = await model.getAllItemsOfType(webIfc.IFCPROJECT, false);
		const projectId = Array.isArray(projectIds) ? projectIds[0] : undefined;
		const project = projectId != null ? await model.getItemProperties(projectId, false) : null;
		const unitScale = project ? await parseLengthUnitScale(model, project) : 1;

		const mapConversionIds = await model.getAllItemsOfType(webIfc.IFCMAPCONVERSION, false);
		const mapConversionId = Array.isArray(mapConversionIds) ? mapConversionIds[0] : undefined;
		if (mapConversionId != null) {
			const mapConversion = await model.getItemProperties(mapConversionId, false);
			const placement = await parseMapConversionPlacement(model, mapConversion);
			console.log(`${IFC_DEBUG_PREFIX} map conversion metadata`, {
				fileName: file.name,
				mapConversionId,
				mapConversion,
				placement,
				unitScale
			});
			return {
				...placement,
				unitScale
			};
		}

		const siteIds = await model.getAllItemsOfType(webIfc.IFCSITE, false);
		const siteId = Array.isArray(siteIds) ? siteIds[0] : undefined;
		if (siteId == null) {
			console.log(`${IFC_DEBUG_PREFIX} no site or map conversion metadata`, {
				fileName: file.name,
				unitScale
			});
			return unitScale !== 1 ? { unitScale } : undefined;
		}

		const site = await model.getItemProperties(siteId, false);
		const lat = parseAngleComponentList(site?.RefLatitude);
		const lng = parseAngleComponentList(site?.RefLongitude);
		const refElevation = Number(unwrapIfcValue(site?.RefElevation) ?? 0);

		const placement = {
			lng: Number.isFinite(lng) ? lng : undefined,
			lat: Number.isFinite(lat) ? lat : undefined,
			altitude: Number.isFinite(refElevation) ? refElevation * unitScale : undefined,
			unitScale
		};
		console.log(`${IFC_DEBUG_PREFIX} site placement metadata`, {
			fileName: file.name,
			siteId,
			placement
		});
		return placement;
	} finally {
		await model.ifcManager?.dispose?.();
	}
};
