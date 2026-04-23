export const mercatorToLng = (x: number): number => (x / 20037508.34) * 180;

export const mercatorToLat = (y: number): number => {
	const lat = (y / 20037508.34) * 180;
	return (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
};
