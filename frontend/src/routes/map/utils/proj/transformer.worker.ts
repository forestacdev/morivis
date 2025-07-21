import proj4 from 'proj4';

const flattenCoordinates = (coordinates, flattened = []) => {
	coordinates.forEach((coord) => {
		if (Array.isArray(coord[0])) {
			flattenCoordinates(coord, flattened);
		} else {
			flattened.push(...coord);
		}
	});
	return flattened;
};

const unflattenCoordinates = (flattened, originalStructure) => {
	let index = 0;
	const unflattenRecursive = (structure) => {
		return structure.map((item) => {
			if (Array.isArray(item[0])) {
				return unflattenRecursive(item);
			} else {
				// 元の構造が[num, num]のような単一座標の場合、item.lengthは未定義になる可能性があるため、
				// 座標の次元数（通常は2または3）を考慮する必要があります。
				// ここでは単純に2次元座標を想定します。
				const coordLength = Array.isArray(item) ? item.length : 2; // デフォルト2次元
				const coord = flattened.slice(index, index + coordLength);
				index += coordLength;
				return coord;
			}
		});
	};
	return unflattenRecursive(originalStructure);
};

onmessage = (event) => {
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
			error: error.message,
			featureIndex: featureIndex
		});
	}
};
