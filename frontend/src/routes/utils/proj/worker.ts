import proj4 from 'proj4';

export const flattenCoordinates = (coordinates: any, flattened: number[] = []) => {
	coordinates.forEach((coord: any) => {
		if (Array.isArray(coord[0])) {
			flattenCoordinates(coord, flattened);
		} else {
			flattened.push(...coord);
		}
	});
	return flattened;
};

export const unflattenCoordinates = (flattened: number[], originalStructure: any): any => {
	const result: any = [];
	let index = 0;

	const unflattenRecursive = (structure: any) => {
		return structure.map((item: any) => {
			if (Array.isArray(item[0])) {
				return unflattenRecursive(item);
			} else {
				const coord = flattened.slice(index, index + item.length);
				index += item.length;
				return coord;
			}
		});
	};

	return unflattenRecursive(originalStructure);
};
onmessage = (event) => {
	const { geojson, prjContent } = event.data;
	console.log('Worker received data:', geojson, prjContent);

	const transformedFeatures = geojson.features.map((feature) => {
		const originalCoordinates = JSON.parse(JSON.stringify(feature.geometry.coordinates));
		const flattenedCoordinates = flattenCoordinates(feature.geometry.coordinates);
		const convertedFlattened = [];
		for (let i = 0; i < flattenedCoordinates.length; i += 2) {
			const converted = proj4(prjContent, 'EPSG:4326', [
				flattenedCoordinates[i],
				flattenedCoordinates[i + 1]
			]);
			convertedFlattened.push(...converted);
		}
		return {
			...feature,
			geometry: {
				...feature.geometry,
				coordinates: unflattenCoordinates(convertedFlattened, originalCoordinates)
			}
		};
	});

	postMessage({
		type: 'FeatureCollection',
		features: transformedFeatures
	});
};
