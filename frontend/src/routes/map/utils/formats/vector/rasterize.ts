import turfBbox from '@turf/bbox';

import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import { getMinMax, type RasterBands } from '$routes/map/utils/formats/geotiff';
import { generateThumbnail } from '$routes/map/utils/formats/raster/thumbnail';

const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;
const PADDING_RATIO = 0.05;
const FILL_COLOR = 'rgba(220, 38, 38, 0.22)';
const STROKE_COLOR = '#dc2626';
const POINT_COLOR = '#dc2626';
const POINT_RADIUS = 4;
const LINE_WIDTH = 2;
const VECTOR_NODATA = 0;

const canvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error('ラスター画像の生成に失敗しました'));
				return;
			}
			resolve(blob);
		}, 'image/png');
	});
};

const createProjector = (bbox: [number, number, number, number], width: number, height: number) => {
	const [minX, minY, maxX, maxY] = bbox;
	const spanX = Math.max(maxX - minX, Number.EPSILON);
	const spanY = Math.max(maxY - minY, Number.EPSILON);
	const paddedMinX = minX - spanX * PADDING_RATIO;
	const paddedMaxX = maxX + spanX * PADDING_RATIO;
	const paddedMinY = minY - spanY * PADDING_RATIO;
	const paddedMaxY = maxY + spanY * PADDING_RATIO;
	const paddedSpanX = Math.max(paddedMaxX - paddedMinX, Number.EPSILON);
	const paddedSpanY = Math.max(paddedMaxY - paddedMinY, Number.EPSILON);

	return (coordinate: number[]): [number, number] => {
		const x = ((coordinate[0] - paddedMinX) / paddedSpanX) * width;
		const y = height - ((coordinate[1] - paddedMinY) / paddedSpanY) * height;
		return [x, y];
	};
};

const drawLineString = (
	context: CanvasRenderingContext2D,
	coordinates: number[][],
	project: (coordinate: number[]) => [number, number]
) => {
	if (coordinates.length === 0) return;
	context.beginPath();
	coordinates.forEach((coordinate, index) => {
		const [x, y] = project(coordinate);
		if (index === 0) {
			context.moveTo(x, y);
			return;
		}
		context.lineTo(x, y);
	});
	context.stroke();
};

const drawPolygon = (
	context: CanvasRenderingContext2D,
	rings: number[][][],
	project: (coordinate: number[]) => [number, number]
) => {
	if (rings.length === 0) return;
	context.beginPath();
	rings.forEach((ring) => {
		ring.forEach((coordinate, index) => {
			const [x, y] = project(coordinate);
			if (index === 0) {
				context.moveTo(x, y);
				return;
			}
			context.lineTo(x, y);
		});
		context.closePath();
	});
	context.fill();
	context.stroke();
};

const drawPoint = (
	context: CanvasRenderingContext2D,
	coordinate: number[],
	project: (coordinate: number[]) => [number, number]
) => {
	const [x, y] = project(coordinate);
	context.beginPath();
	context.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
	context.fill();
	context.stroke();
};

const drawFeature = (
	context: CanvasRenderingContext2D,
	feature: Feature,
	project: (coordinate: number[]) => [number, number]
) => {
	if (!feature.geometry) return;

	switch (feature.geometry.type) {
		case 'Polygon':
			drawPolygon(context, feature.geometry.coordinates as number[][][], project);
			return;
		case 'MultiPolygon':
			(feature.geometry.coordinates as number[][][][]).forEach((polygon) => {
				drawPolygon(context, polygon, project);
			});
			return;
		case 'LineString':
			drawLineString(context, feature.geometry.coordinates as number[][], project);
			return;
		case 'MultiLineString':
			(feature.geometry.coordinates as number[][][]).forEach((line) => {
				drawLineString(context, line, project);
			});
			return;
		case 'Point':
			drawPoint(context, feature.geometry.coordinates as number[], project);
			return;
		case 'MultiPoint':
			(feature.geometry.coordinates as number[][]).forEach((point) => {
				drawPoint(context, point, project);
			});
			return;
		default:
			return;
	}
};

export const featureCollectionToGeoRefData = async ({
	featureCollection,
	entryName,
	width = DEFAULT_WIDTH,
	height = DEFAULT_HEIGHT
}: {
	featureCollection: FeatureCollection;
	entryName: string;
	width?: number;
	height?: number;
}): Promise<GeoRefData> => {
	const bbox = turfBbox(featureCollection) as [number, number, number, number];
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('キャンバスの初期化に失敗しました');
	}

	context.clearRect(0, 0, width, height);
	context.strokeStyle = STROKE_COLOR;
	context.lineWidth = LINE_WIDTH;
	context.fillStyle = FILL_COLOR;

	const project = createProjector(bbox, width, height);
	featureCollection.features.forEach((feature) => {
		drawFeature(context, feature as Feature, project);
	});

	context.fillStyle = POINT_COLOR;
	context.strokeStyle = POINT_COLOR;
	featureCollection.features.forEach((feature) => {
		if (feature.geometry?.type === 'Point' || feature.geometry?.type === 'MultiPoint') {
			drawFeature(context, feature as Feature, project);
		}
	});

	const imageData = context.getImageData(0, 0, width, height);
	const pixelCount = width * height;
	const rBand = new Uint8Array(pixelCount);
	const gBand = new Uint8Array(pixelCount);
	const bBand = new Uint8Array(pixelCount);

	for (let i = 0; i < pixelCount; i++) {
		rBand[i] = imageData.data[i * 4];
		gBand[i] = imageData.data[i * 4 + 1];
		bBand[i] = imageData.data[i * 4 + 2];
	}

	const parsedBands: RasterBands = [rBand, gBand, bBand];
	const dataRanges = parsedBands.map((band) => getMinMax(band, VECTOR_NODATA));
	const blob = await canvasToBlob(canvas);
	const imageFile = new File([blob], `${entryName}.png`, { type: 'image/png' });
	const previewImageUrl = generateThumbnail({
		bands: parsedBands,
		width,
		height,
		nodata: VECTOR_NODATA,
		ranges: dataRanges
	});

	return {
		sourceType: 'vector',
		entryId: `georef_vector_${crypto.randomUUID()}`,
		entryName,
		parsedBands,
		parsedNodata: VECTOR_NODATA,
		dataRanges,
		numBands: 3,
		imageWidth: width,
		imageHeight: height,
		bandMinMax: dataRanges[0],
		multiBandMinMax: {
			r: dataRanges[0],
			g: dataRanges[1],
			b: dataRanges[2]
		},
		imageFile,
		previewImageUrl,
		sourceFeatureCollection: featureCollection,
		initialCorners: [
			[bbox[0], bbox[3]],
			[bbox[2], bbox[3]],
			[bbox[2], bbox[1]],
			[bbox[0], bbox[1]]
		],
		registrationMode: 'raster'
	};
};
