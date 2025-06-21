import turfHexGrid from '@turf/hex-grid';
import turfBbox from '@turf/bbox';
import turfCollect from '@turf/collect';
import turfCentroid from '@turf/centroid';
import type { map } from 'es-toolkit/compat';

function calculateCellSize(zoom) {
	const baseSize = 10; // km
	return baseSize / Math.pow(2, Math.max(0, zoom - 8));
}

function selectBestPoint(pointsInCell) {
	if (!pointsInCell || pointsInCell.length === 0) {
		return null;
	}

	if (pointsInCell.length === 1) {
		return pointsInCell[0];
	}

	// 最初のポイントを返す（シンプルな選択）
	return pointsInCell[0];

	// またはランダム選択
	// return pointsInCell[Math.floor(Math.random() * pointsInCell.length)];
}

export function optimizedGridThinning(points, zoomLevel, map) {
	try {
		// より厳密な入力検証
		console.log('Input validation - points:', points);

		if (!points) {
			console.error('Points is null or undefined');
			return { type: 'FeatureCollection', features: [] };
		}

		if (!points.features) {
			console.error('Points.features is null or undefined');
			return { type: 'FeatureCollection', features: [] };
		}

		if (!Array.isArray(points.features)) {
			console.error('Points.features is not an array:', typeof points.features);
			return { type: 'FeatureCollection', features: [] };
		}

		if (points.features.length === 0) {
			console.log('No points to thin');
			return points;
		}

		const cellSize = calculateCellSize(zoomLevel);

		const bbox = map?.getBounds();
		const bboxCoords = bbox
			? [bbox.getWest(), bbox.getSouth(), bbox.getEast(), bbox.getNorth()]
			: null;

		const hexGrid = turfHexGrid(bboxCoords, cellSize, { units: 'kilometers' });

		const hexSource = map?.getSource('hex') as maplibregl.GeoJSONSource;
		if (hexSource) {
			hexSource.setData(hexGrid);
		} else {
			console.error('Source "hex" not found');
		}

		// より安全なポイント処理
		const pointsWithId = {
			type: 'FeatureCollection',
			features: points.features
				.map((point, index) => {
					// ポイントの構造を確認
					if (!point || !point.geometry) {
						console.warn('Invalid point at index', index, point);
						return null;
					}

					return {
						...point,
						properties: {
							...(point.properties || {}),
							_tempId: index
						}
					};
				})
				.filter((point) => point !== null) // 無効なポイントを除外
		};

		// turf.collectを実行
		const collected = turfCollect(hexGrid, pointsWithId, '_tempId', 'pointIds');

		// 結果の検証
		if (!collected || !collected.features || !Array.isArray(collected.features)) {
			console.error('Invalid collected result:', collected);
			return points;
		}

		const thinnedFeatures = collected.features
			.filter((hex) => {
				// より安全なフィルタリング
				return (
					hex &&
					hex.properties &&
					hex.properties.pointIds &&
					Array.isArray(hex.properties.pointIds) &&
					hex.properties.pointIds.length > 0
				);
			})
			.map((hex) => {
				try {
					// 正しいプロパティ名を使用
					const pointIds = hex.properties.pointIds; // .id ではなく .pointIds

					// IDから実際のポイントを取得
					const pointsInHex = pointIds
						.filter((id) => typeof id === 'number' && id >= 0 && id < pointsWithId.features.length)
						.map((id) => pointsWithId.features[id])
						.filter((point) => point !== null && point !== undefined);

					if (pointsInHex.length === 0) {
						return null;
					}

					const bestPoint = selectBestPoint(pointsInHex);

					if (!bestPoint) {
						return null;
					}

					return {
						type: 'Feature',
						geometry: bestPoint.geometry,
						properties: bestPoint.properties || {}
					};
				} catch (hexError) {
					console.error('Error processing hex:', hexError, hex);
					return null;
				}
			})
			.filter((feature) => feature !== null);

		const thinnedGeoJSON = {
			type: 'FeatureCollection',
			features: thinnedFeatures
		};

		return thinnedGeoJSON;
	} catch (error) {
		console.error('Error in optimizedGridThinning:', error);
		console.error('Stack trace:', error.stack);
		// エラー時は元のデータを返す
		return points || { type: 'FeatureCollection', features: [] };
	}
}
