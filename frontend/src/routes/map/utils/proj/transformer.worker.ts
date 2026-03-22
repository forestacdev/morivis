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
	features: GeoJSONFeature[];
	prjContent: string;
	batchIndex: number;
}

/**
 * 座標の次元数を検出する（2D or 3D）
 */
const detectStride = (coordinates: NestedCoordinates): number => {
	if (typeof coordinates[0] === 'number') {
		return coordinates.length;
	}
	return detectStride(coordinates[0] as NestedCoordinates);
};

const flattenCoordinates = (coordinates: NestedCoordinates, flattened: number[] = []): number[] => {
	if (typeof coordinates[0] === 'number') {
		for (let i = 0; i < coordinates.length; i++) {
			flattened.push(coordinates[i] as number);
		}
		return flattened;
	}
	for (const coord of coordinates as NestedCoordinates[]) {
		if (Array.isArray(coord[0])) {
			flattenCoordinates(coord as NestedCoordinates, flattened);
		} else {
			for (let i = 0; i < coord.length; i++) {
				flattened.push(coord[i] as number);
			}
		}
	}
	return flattened;
};

const unflattenCoordinates = (
	flattened: number[],
	originalStructure: NestedCoordinates
): NestedCoordinates => {
	let index = 0;
	const unflattenRecursive = (structure: NestedCoordinates): NestedCoordinates => {
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

// proj4コンバーターのキャッシュ
let cachedConverter: proj4.Converter | null = null;
let cachedPrj = '';

const transformFeature = (feature: GeoJSONFeature): GeoJSONFeature => {
	const stride = detectStride(feature.geometry.coordinates);
	const flattened = flattenCoordinates(feature.geometry.coordinates);
	const convertedFlattened = new Array<number>(flattened.length);

	for (let i = 0; i < flattened.length; i += stride) {
		const converted = cachedConverter!.forward([flattened[i], flattened[i + 1]]);
		convertedFlattened[i] = converted[0];
		convertedFlattened[i + 1] = converted[1];
		for (let j = 2; j < stride; j++) {
			convertedFlattened[i + j] = flattened[i + j];
		}
	}

	return {
		...feature,
		geometry: {
			...feature.geometry,
			coordinates: unflattenCoordinates(convertedFlattened, feature.geometry.coordinates)
		}
	};
};

onmessage = (event: MessageEvent<WorkerMessageData>) => {
	const { features, prjContent, batchIndex } = event.data;

	try {
		if (prjContent !== cachedPrj) {
			cachedConverter = proj4(prjContent, 'EPSG:4326');
			cachedPrj = prjContent;
		}

		const transformedFeatures = features.map(transformFeature);

		postMessage({
			type: 'TRANSFORMED_BATCH',
			transformedFeatures,
			batchIndex
		});
	} catch (error) {
		postMessage({
			type: 'ERROR',
			error: error instanceof Error ? error.message : String(error),
			batchIndex
		});
	}
};
