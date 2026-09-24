export type OsmElementType = 'node' | 'way' | 'relation';
export interface OsmElementRef {
	type: OsmElementType;
	id: number;
}
export interface OsmTaggedElement extends OsmElementRef {
	tags?: Record<string, string>;
	lat?: number;
	lon?: number;
}

export const checkOsmPoiMatch = (
	properties: Record<string, unknown>,
	coordinates: number[],
	element: OsmTaggedElement
) => {
	const names = Object.entries(properties)
		.filter(([key, value]) =>
			(key === 'name' || key.startsWith('name:')) && typeof value === 'string'
		)
		.map(([, value]) => value as string);
	const osmNames = Object.entries(element.tags ?? {})
		.filter(([key]) => key === 'name' || key.startsWith('name:'))
		.map(([, value]) => value);
	const nameMatches = names.length && osmNames.length
		? names.some((name) => osmNames.includes(name))
		: null;
	let distanceMeters: number | null = null;
	if (
		element.type === 'node' && Number.isFinite(element.lat) && Number.isFinite(element.lon)
		&& Number.isFinite(coordinates[0]) && Number.isFinite(coordinates[1])
	) {
		const toRad = Math.PI / 180;
		const [lon, lat] = coordinates;
		const dLat = (element.lat! - lat) * toRad;
		const dLon = (element.lon! - lon) * toRad;
		const a = Math.sin(dLat / 2) ** 2
			+ Math.cos(lat * toRad) * Math.cos(element.lat! * toRad) * Math.sin(dLon / 2) ** 2;
		distanceMeters = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
	}
	const status = nameMatches === false || (distanceMeters !== null && distanceMeters > 100)
		? 'mismatch'
		: nameMatches === true || (distanceMeters !== null && distanceMeters <= 100)
		? 'match'
		: 'unverified';
	return { status, nameMatches, distanceMeters };
};

// tile.openstreetmap.jpのPlanetiler製タイル: OSM ID × 10 + node=1 / way=2 / relation=3。
export const decodePlanetilerPoiId = (featureId: unknown): OsmElementRef | null => {
	if (typeof featureId !== 'number' && typeof featureId !== 'string') return null;
	if (typeof featureId === 'string' && !/^\d+$/.test(featureId)) return null;
	const encodedId = Number(featureId);
	if (!Number.isSafeInteger(encodedId) || encodedId < 10) return null;
	const typeCode = encodedId % 10;
	const type = typeCode === 1
		? 'node'
		: typeCode === 2
		? 'way'
		: typeCode === 3
		? 'relation'
		: null;
	return type ? { type, id: Math.floor(encodedId / 10) } : null;
};

const elementCache = new Map<string, Promise<OsmTaggedElement>>();

export const fetchOsmPoiElement = (ref: OsmElementRef): Promise<OsmTaggedElement> => {
	const key = `${ref.type}/${ref.id}`;
	const cached = elementCache.get(key);
	if (cached) return cached;
	const request = (async () => {
		const response = await fetch(`https://api.openstreetmap.org/api/0.6/${key}.json`, {
			signal: AbortSignal.timeout(10000)
		});
		if (!response.ok) throw new Error(`OSM API: ${response.status} (${key})`);
		const data: { elements?: OsmTaggedElement[]; } = await response.json();
		const element = data.elements?.find((item) => item.type === ref.type && item.id === ref.id);
		if (!element) throw new Error(`OSMの地物が見つかりません (${key})`);
		return element;
	})().catch((error) => {
		elementCache.delete(key);
		throw error;
	});
	elementCache.set(key, request);
	return request;
};
