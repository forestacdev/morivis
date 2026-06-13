import JSZip from 'jszip';
import { KML_NS } from './constants';
import { getDirectChildElement, getFirstChildText, parseXmlDocument } from './xml';

export interface KmlGroundOverlayResult {
	entryName: string;
	imageFile: File;
	imageHref: string;
	bbox: [number, number, number, number];
	corners: [[number, number], [number, number], [number, number], [number, number]];
}

export interface KmzModelPlacement {
	name?: string;
	lng: number;
	lat: number;
	altitude: number;
	scale?: number;
}

export interface KmzModelResult {
	modelFiles: File[];
	mainModelPath: string;
	placement?: KmzModelPlacement;
}

export interface KmlModelResult {
	modelFiles: File[];
	mainModelPath?: string;
	modelUrl?: string;
	placement?: KmzModelPlacement;
}

export const extractKmlFromKmz = async (file: File): Promise<string> => {
	const zip = await JSZip.loadAsync(await file.arrayBuffer());
	const kmlFileName = Object.keys(zip.files).find((name) => name.endsWith('.kml'));

	if (!kmlFileName) {
		throw new Error('No KML file found in KMZ');
	}

	return zip.files[kmlFileName].async('string');
};

const extractKmzPayload = async (file: File) => {
	const zip = await JSZip.loadAsync(await file.arrayBuffer());
	const kmlFileName = Object.keys(zip.files).find((name) => name.toLowerCase().endsWith('.kml'));

	if (!kmlFileName) {
		throw new Error('No KML file found in KMZ');
	}

	const kmlText = await zip.files[kmlFileName].async('string');
	return { zip, kmlFileName, kmlText };
};

const resolveEntryPath = (basePath: string, relativePath: string) => {
	const baseSegments = basePath.split('/').slice(0, -1);
	const targetSegments = relativePath.split('/');
	const resolved = [...baseSegments];

	for (const segment of targetSegments) {
		if (segment === '' || segment === '.') continue;
		if (segment === '..') {
			resolved.pop();
			continue;
		}
		resolved.push(segment);
	}

	return resolved.join('/');
};

const getPathLikeName = (file: File) => {
	const relativePath = (file as File & { morivisRelativePath?: string; }).morivisRelativePath;
	return (relativePath ?? file.name).replace(/\\/g, '/');
};

const setRelativePath = (file: File, relativePath: string) => {
	Object.defineProperty(file, 'morivisRelativePath', {
		value: relativePath,
		configurable: true
	});
	return file;
};

const setModelPlacement = (file: File, placement: KmzModelPlacement) => {
	Object.defineProperty(file, 'morivisModelPlacement', {
		value: placement,
		configurable: true
	});
	return file;
};

const parseKmzModelPlacement = (doc: Document): KmzModelPlacement | undefined => {
	const placemark = doc.getElementsByTagNameNS(KML_NS, 'Placemark')[0];
	if (!placemark) return undefined;

	const name = getFirstChildText(placemark, KML_NS, 'name') ?? undefined;
	const model = placemark.getElementsByTagNameNS(KML_NS, 'Model')[0];
	const point = placemark.getElementsByTagNameNS(KML_NS, 'Point')[0];

	const location = model ? getDirectChildElement(model, KML_NS, 'Location') : null;
	const locationLng = location ? Number(getFirstChildText(location, KML_NS, 'longitude')) : NaN;
	const locationLat = location ? Number(getFirstChildText(location, KML_NS, 'latitude')) : NaN;
	const locationAltitude = location
		? Number(getFirstChildText(location, KML_NS, 'altitude'))
		: NaN;

	if (Number.isFinite(locationLng) && Number.isFinite(locationLat)) {
		const scaleNode = getDirectChildElement(model!, KML_NS, 'Scale');
		const scaleX = scaleNode ? Number(getFirstChildText(scaleNode, KML_NS, 'x')) : NaN;
		const scaleY = scaleNode ? Number(getFirstChildText(scaleNode, KML_NS, 'y')) : NaN;
		const scaleZ = scaleNode ? Number(getFirstChildText(scaleNode, KML_NS, 'z')) : NaN;
		const uniformScale = Number.isFinite(scaleX)
				&& Number.isFinite(scaleY)
				&& Number.isFinite(scaleZ)
				&& Math.abs(scaleX - scaleY) < 1e-6
				&& Math.abs(scaleX - scaleZ) < 1e-6
			? scaleX
			: undefined;

		return {
			name,
			lng: locationLng,
			lat: locationLat,
			altitude: Number.isFinite(locationAltitude) ? locationAltitude : 0,
			scale: uniformScale
		};
	}

	const coordinatesText = point ? getFirstChildText(point, KML_NS, 'coordinates') : null;
	if (!coordinatesText) return undefined;

	const [lngText, latText, altitudeText] = coordinatesText.split(',').map((value) =>
		value.trim()
	);
	const lng = Number(lngText);
	const lat = Number(latText);
	const altitude = Number(altitudeText ?? '0');
	if (!Number.isFinite(lng) || !Number.isFinite(lat)) return undefined;

	return {
		name,
		lng,
		lat,
		altitude: Number.isFinite(altitude) ? altitude : 0
	};
};

export const extractModelFromKmz = async (file: File): Promise<KmzModelResult | null> => {
	const { zip, kmlFileName, kmlText } = await extractKmzPayload(file);
	const doc = await parseXmlDocument(kmlText);
	const model = doc.getElementsByTagNameNS(KML_NS, 'Model')[0];
	if (!model) return null;

	const link = getDirectChildElement(model, KML_NS, 'Link');
	const href = link ? getFirstChildText(link, KML_NS, 'href') : null;
	if (!href) return null;

	const mainModelPathCandidates = [
		resolveEntryPath(kmlFileName, href),
		href.replace(/^\/+/, '')
	];
	const mainModelPath = mainModelPathCandidates.find((path) => Boolean(zip.files[path]));
	if (!mainModelPath) {
		throw new Error(`Model file not found in KMZ: ${href}`);
	}

	const placement = parseKmzModelPlacement(doc);
	const modelFiles: File[] = [];

	for (const [path, entry] of Object.entries(zip.files)) {
		if (entry.dir || path.startsWith('__MACOSX/')) continue;
		if (path.toLowerCase().endsWith('.kml')) continue;

		const blob = await entry.async('blob');
		const fileName = path.split('/').pop() ?? path;
		const extractedFile = setRelativePath(
			new File([blob], fileName, { type: blob.type }),
			path
		);
		modelFiles.push(
			path === mainModelPath && placement
				? setModelPlacement(extractedFile, placement)
				: extractedFile
		);
	}

	return {
		modelFiles,
		mainModelPath,
		placement
	};
};

export const extractModelFromKml = async (
	file: File,
	relatedFiles: File[] = []
): Promise<KmlModelResult | null> => {
	const kmlText = await file.text();
	const doc = await parseXmlDocument(kmlText);
	const model = doc.getElementsByTagNameNS(KML_NS, 'Model')[0];
	if (!model) return null;

	const link = getDirectChildElement(model, KML_NS, 'Link');
	const href = link ? getFirstChildText(link, KML_NS, 'href') : null;
	if (!href) return null;

	const placement = parseKmzModelPlacement(doc);
	if (/^https?:\/\//i.test(href)) {
		return {
			modelFiles: [],
			modelUrl: href,
			placement
		};
	}

	const basePath = getPathLikeName(file);
	const mainModelPathCandidates = [
		resolveEntryPath(basePath, href),
		href.replace(/^\/+/, ''),
		href
	].map((path) => path.replace(/\\/g, '/'));

	const sourceFiles = relatedFiles.filter((candidate) => candidate !== file);
	const pathMap = new Map(
		sourceFiles.map((candidate) =>
			[getPathLikeName(candidate).toLowerCase(), candidate] as const
		)
	);
	const mainModelPath = mainModelPathCandidates.find((path) => pathMap.has(path.toLowerCase()));
	if (!mainModelPath) return null;

	const modelFiles = sourceFiles
		.filter((candidate) => !getPathLikeName(candidate).toLowerCase().endsWith('.kml'))
		.map((candidate) => {
			const relativePath = getPathLikeName(candidate);
			const prepared = setRelativePath(candidate, relativePath);
			return relativePath.toLowerCase() === mainModelPath.toLowerCase() && placement
				? setModelPlacement(prepared, placement)
				: prepared;
		});

	return {
		modelFiles,
		mainModelPath,
		placement
	};
};

export const extractGroundOverlayFromKmz = async (
	file: File
): Promise<KmlGroundOverlayResult | null> => {
	const { zip, kmlFileName, kmlText } = await extractKmzPayload(file);
	const doc = await parseXmlDocument(kmlText);
	const overlay = doc.getElementsByTagNameNS(KML_NS, 'GroundOverlay')[0];
	if (!overlay) return null;

	const icon = getDirectChildElement(overlay, KML_NS, 'Icon');
	const href = icon ? getFirstChildText(icon, KML_NS, 'href') : null;
	const latLonBox = getDirectChildElement(overlay, KML_NS, 'LatLonBox');
	if (!href || !latLonBox) return null;

	const west = Number(getFirstChildText(latLonBox, KML_NS, 'west'));
	const south = Number(getFirstChildText(latLonBox, KML_NS, 'south'));
	const east = Number(getFirstChildText(latLonBox, KML_NS, 'east'));
	const north = Number(getFirstChildText(latLonBox, KML_NS, 'north'));
	if (![west, south, east, north].every((value) => Number.isFinite(value))) {
		return null;
	}

	const imagePathCandidates = [resolveEntryPath(kmlFileName, href), href.replace(/^\/+/, '')];
	const imagePath = imagePathCandidates.find((path) => Boolean(zip.files[path]));
	if (!imagePath) {
		throw new Error(`GroundOverlay image not found in KMZ: ${href}`);
	}

	const imageBlob = await zip.files[imagePath].async('blob');
	const imageName = imagePath.split('/').pop() ?? 'overlay-image';
	const imageFile = new File([imageBlob], imageName, { type: imageBlob.type || 'image/png' });
	const entryName = file.name.replace(/\.[^.]+$/, '');

	return {
		entryName,
		imageFile,
		imageHref: href,
		bbox: [west, south, east, north],
		corners: [
			[west, north],
			[east, north],
			[east, south],
			[west, south]
		]
	};
};
