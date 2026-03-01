import proj4 from 'proj4';

type Coordinate = number[];
type NestedCoordinates = Coordinate | NestedCoordinates[];

interface GeoJSONFeature {
	type: string;
	geometry: {
		type: string;
		coordinates: NestedCoordinates;
	};
	properties?: Record<string, unknown>;
}

interface WorkerMessageData {
	feature: GeoJSONFeature;
	prjContent: string;
	featureIndex: number;
}

const flattenCoordinates = (coordinates: NestedCoordinates, flattened: number[] = []): number[] => {
	// Point: coordinates = [x, y] (数値の配列)
	if (typeof coordinates[0] === 'number') {
		flattened.push(...(coordinates as number[]));
		return flattened;
	}
	(coordinates as NestedCoordinates[]).forEach((coord) => {
		if (Array.isArray(coord[0])) {
			flattenCoordinates(coord as NestedCoordinates, flattened);
		} else {
			flattened.push(...(coord as number[]));
		}
	});
	return flattened;
};

const unflattenCoordinates = (
	flattened: number[],
	originalStructure: NestedCoordinates
): NestedCoordinates => {
	let index = 0;
	const unflattenRecursive = (structure: NestedCoordinates): NestedCoordinates => {
		// Point: structure = [x, y] (数値の配列)
		if (typeof structure[0] === 'number') {
			const coordLength = structure.length;
			const coord = flattened.slice(index, index + coordLength);
			index += coordLength;
			return coord;
		}
		return (structure as NestedCoordinates[]).map((item) => {
			if (Array.isArray(item[0])) {
				return unflattenRecursive(item as NestedCoordinates);
			} else {
				const coordLength = Array.isArray(item) ? item.length : 2;
				const coord = flattened.slice(index, index + coordLength);
				index += coordLength;
				return coord;
			}
		});
	};
	return unflattenRecursive(originalStructure);
};

onmessage = (event: MessageEvent<WorkerMessageData>) => {
	const { feature, prjContent, featureIndex } = event.data;
	// console.log(`Worker processing featureIndex: ${featureIndex}`);

	try {
		const originalCoordinatesStructure = JSON.parse(JSON.stringify(feature.geometry.coordinates));
		const flattened = flattenCoordinates(feature.geometry.coordinates); // ここを修正
		const convertedFlattened = [];

		for (let i = 0; i < flattened.length; i += 2) {
			const converted = proj4(prjContent, 'EPSG:4326', [flattened[i], flattened[i + 1]]);
			convertedFlattened.push(...converted);
		}

		const transformedFeature = {
			...feature,
			geometry: {
				...feature.geometry,
				coordinates: unflattenCoordinates(convertedFlattened, originalCoordinatesStructure)
			}
		};

		postMessage({
			type: 'TRANSFORMED_FEATURE',
			transformedFeature: transformedFeature,
			featureIndex: featureIndex // 元のインデックスを返す（順序不問なら不要だがデバッグに便利）
		});
	} catch (error) {
		console.error(`Error in worker processing featureIndex ${featureIndex}:`, error);
		postMessage({
			type: 'ERROR',
			error: error instanceof Error ? error.message : String(error),
			featureIndex: featureIndex
		});
	}
};
