import DxfParser from 'dxf-parser';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

/**
 * DXFファイルの内容をGeoJSONに変換
 */
export const dxfToGeoJson = (dxfText: string): FeatureCollection => {
	const parser = new DxfParser();
	const dxf = parser.parseSync(dxfText);

	if (!dxf) {
		throw new Error('DXFの解析に失敗しました');
	}

	const features: Feature[] = [];

	dxf.entities.forEach((entity: any) => {
		const feature = entityToFeature(entity);
		if (feature) {
			features.push(feature);
		}
	});

	return {
		type: 'FeatureCollection',
		features
	};
};

/**
 * DXFエンティティをGeoJSON Featureに変換
 */
const entityToFeature = (entity: any): Feature | null => {
	let geometry: Geometry | null = null;
	const properties: Record<string, any> = {
		layer: entity.layer,
		color: entity.color,
		type: entity.type
	};

	switch (entity.type) {
		case 'POINT':
			geometry = {
				type: 'Point',
				coordinates: [entity.position.x, entity.position.y]
			};
			break;

		case 'LINE':
			geometry = {
				type: 'LineString',
				coordinates: [
					[entity.vertices[0].x, entity.vertices[0].y],
					[entity.vertices[1].x, entity.vertices[1].y]
				]
			};
			break;

		case 'LWPOLYLINE':
		case 'POLYLINE': {
			const coordinates = entity.vertices.map((v: any) => [v.x, v.y]);

			// 閉じたポリライン → Polygon
			if (entity.shape && coordinates.length >= 3) {
				coordinates.push(coordinates[0]); // 最初の点を追加して閉じる
				geometry = {
					type: 'Polygon',
					coordinates: [coordinates]
				};
			} else {
				// 開いたポリライン → LineString
				geometry = {
					type: 'LineString',
					coordinates
				};
			}
			break;
		}
		case 'CIRCLE': {
			// 円を多角形として近似（36点）
			const circleCoords = approximateCircle(entity.center.x, entity.center.y, entity.radius, 36);
			geometry = {
				type: 'Polygon',
				coordinates: [circleCoords]
			};
			properties.radius = entity.radius;
			break;
		}
		case 'ARC': {
			// 円弧をLineStringとして近似
			const arcCoords = approximateArc(
				entity.center.x,
				entity.center.y,
				entity.radius,
				entity.startAngle,
				entity.endAngle,
				36
			);
			geometry = {
				type: 'LineString',
				coordinates: arcCoords
			};
			properties.radius = entity.radius;
			properties.startAngle = entity.startAngle;
			properties.endAngle = entity.endAngle;
			break;
		}
		case 'ELLIPSE': {
			// 楕円を多角形として近似
			const ellipseCoords = approximateEllipse(
				entity.center.x,
				entity.center.y,
				entity.majorAxisEndPoint,
				entity.axisRatio,
				entity.startAngle || 0,
				entity.endAngle || Math.PI * 2,
				36
			);
			geometry = {
				type: 'Polygon',
				coordinates: [ellipseCoords]
			};
			break;
		}
		case 'SPLINE':
			// スプライン曲線をLineStringとして近似
			if (entity.controlPoints && entity.controlPoints.length > 0) {
				const splineCoords = entity.controlPoints.map((p: any) => [p.x, p.y]);
				geometry = {
					type: 'LineString',
					coordinates: splineCoords
				};
			}
			break;

		case 'TEXT':
		case 'MTEXT':
			// テキストは位置情報として保存
			geometry = {
				type: 'Point',
				coordinates: [
					entity.position?.x || entity.startPoint?.x || 0,
					entity.position?.y || entity.startPoint?.y || 0
				]
			};
			properties.text = entity.text;
			properties.height = entity.height;
			break;

		default:
			console.warn(`Unsupported entity type: ${entity.type}`);
			return null;
	}

	if (!geometry) return null;

	return {
		type: 'Feature',
		geometry,
		properties
	};
};

/**
 * 円を多角形の座標配列として近似
 */
const approximateCircle = (
	cx: number,
	cy: number,
	radius: number,
	segments: number = 36
): number[][] => {
	const coords: number[][] = [];

	for (let i = 0; i <= segments; i++) {
		const angle = (i / segments) * Math.PI * 2;
		const x = cx + radius * Math.cos(angle);
		const y = cy + radius * Math.sin(angle);
		coords.push([x, y]);
	}

	return coords;
};

/**
 * 円弧をLineStringの座標配列として近似
 */
const approximateArc = (
	cx: number,
	cy: number,
	radius: number,
	startAngle: number,
	endAngle: number,
	segments: number = 36
): number[][] => {
	const coords: number[][] = [];

	// 角度を正規化（DXFはラジアン）
	const angle1 = startAngle;
	let angle2 = endAngle;

	if (angle2 < angle1) {
		angle2 += Math.PI * 2;
	}

	const angleRange = angle2 - angle1;
	const numPoints = Math.max(2, Math.ceil((segments * angleRange) / (Math.PI * 2)));

	for (let i = 0; i <= numPoints; i++) {
		const angle = angle1 + (i / numPoints) * angleRange;
		const x = cx + radius * Math.cos(angle);
		const y = cy + radius * Math.sin(angle);
		coords.push([x, y]);
	}

	return coords;
};

/**
 * 楕円を多角形の座標配列として近似
 */
const approximateEllipse = (
	cx: number,
	cy: number,
	majorAxisEndPoint: any,
	axisRatio: number,
	startAngle: number,
	endAngle: number,
	segments: number = 36
): number[][] => {
	const coords: number[][] = [];

	const majorRadius = Math.sqrt(majorAxisEndPoint.x ** 2 + majorAxisEndPoint.y ** 2);
	const minorRadius = majorRadius * axisRatio;
	const rotation = Math.atan2(majorAxisEndPoint.y, majorAxisEndPoint.x);

	const angle1 = startAngle;
	let angle2 = endAngle;

	if (angle2 < angle1) {
		angle2 += Math.PI * 2;
	}

	const angleRange = angle2 - angle1;
	const numPoints = Math.max(2, Math.ceil((segments * angleRange) / (Math.PI * 2)));

	for (let i = 0; i <= numPoints; i++) {
		const t = angle1 + (i / numPoints) * angleRange;

		// 楕円のパラメトリック方程式
		const ex = majorRadius * Math.cos(t);
		const ey = minorRadius * Math.sin(t);

		// 回転を適用
		const x = cx + ex * Math.cos(rotation) - ey * Math.sin(rotation);
		const y = cy + ex * Math.sin(rotation) + ey * Math.cos(rotation);

		coords.push([x, y]);
	}

	return coords;
};

/**
 * ブラウザでのファイル読み込み用
 */
export const dxfFileToGeoJsonBrowser = (file: File): Promise<FeatureCollection> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (e) => {
			try {
				const text = e.target?.result as string;
				const geoJson = dxfToGeoJson(text);
				resolve(geoJson);
			} catch (error) {
				reject(error);
			}
		};

		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
};
