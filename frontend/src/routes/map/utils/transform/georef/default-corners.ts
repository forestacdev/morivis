import type maplibregl from 'maplibre-gl';

export const getDefaultGeoRefCorners = (
	map: maplibregl.Map,
	imageWidth: number,
	imageHeight: number
): [[number, number], [number, number], [number, number], [number, number]] => {
	const center = map.getCenter();
	const bounds = map.getBounds();
	const viewWidth = bounds.getEast() - bounds.getWest();
	const viewHeight = bounds.getNorth() - bounds.getSouth();
	const cosLat = Math.max(Math.cos((center.lat * Math.PI) / 180), 0.000001);
	const aspect = imageWidth / imageHeight;
	const size = Math.min(viewWidth, viewHeight) * 0.3;

	let halfW: number;
	let halfH: number;

	if (aspect >= 1) {
		halfW = size / 2 / cosLat;
		halfH = size / (2 * aspect);
	} else {
		halfW = (size * aspect) / 2 / cosLat;
		halfH = size / 2;
	}

	return [
		[center.lng - halfW, center.lat + halfH],
		[center.lng + halfW, center.lat + halfH],
		[center.lng + halfW, center.lat - halfH],
		[center.lng - halfW, center.lat - halfH]
	];
};
