/**
 * GeoPDFからベクターパスを抽出してGeoJSON FeatureCollectionに変換する
 *
 * vector-parser.tsのparseContentStreamを利用し、
 * PDFのcontent streamからジオメトリを抽出してプロジェクトのGeoJSON型に変換する。
 * 重い処理はWeb Workerで実行する。
 */

import type { FeatureCollection, Feature } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';
import type { GeoTransform } from './geopdf-parser';
import type { VectorFeature } from './vector-parser';
import type { VectorParseResult } from './vector-parse.worker';

export interface ExtractVectorsOptions {
	/** GeoTransform（PDF座標→地理座標の変換） */
	geoTransform: GeoTransform;
	/** PDFページの幅 */
	pageWidth: number;
	/** PDFページの高さ */
	pageHeight: number;
}

/**
 * VectorFeature配列をプロジェクトのFeatureCollectionに変換
 */
const toFeatureCollection = (vectorFeatures: VectorFeature[]): FeatureCollection => {
	const features: Feature[] = vectorFeatures
		.filter((vf) => vf.geometry !== null)
		.map((vf) => {
			const properties: FeatureProp = {};

			if (vf.style.strokeColor) {
				const [r, g, b] = vf.style.strokeColor;
				properties['stroke'] = `rgb(${r},${g},${b})`;
			}
			if (vf.style.fillColor) {
				const [r, g, b] = vf.style.fillColor;
				properties['fill'] = `rgb(${r},${g},${b})`;
			}
			if (vf.style.lineWidth !== undefined) {
				properties['stroke-width'] = vf.style.lineWidth;
			}
			if (vf.layer) {
				properties['layer'] = vf.layer;
			}
			if (vf.mcid !== undefined) {
				properties['_mcid'] = vf.mcid;
			}

			return {
				type: 'Feature' as const,
				geometry: vf.geometry as AnyGeometry,
				properties
			};
		});

	return { type: 'FeatureCollection', features };
};

/**
 * PDFのcontent streamからベクターデータを抽出してGeoJSON FeatureCollectionに変換
 * Web Workerで実行するため非同期
 */
export const extractVectorsFromContentStream = (
	contentStream: string,
	options: ExtractVectorsOptions
): Promise<FeatureCollection> =>
	new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./vector-parse.worker.ts', import.meta.url), {
			type: 'module'
		});

		worker.onmessage = (e: MessageEvent<VectorParseResult>) => {
			worker.terminate();
			if (e.data.error) {
				reject(new Error(e.data.error));
			} else {
				resolve(toFeatureCollection(e.data.features));
			}
		};

		worker.onerror = (error) => {
			worker.terminate();
			reject(new Error(`Vector parse worker error: ${error.message}`));
		};

		// $state ProxyはpostMessageでクローンできないためプレーンオブジェクトに変換
		worker.postMessage({
			content: contentStream,
			options: {
				geoTransform: { ...options.geoTransform },
				pageWidth: options.pageWidth,
				pageHeight: options.pageHeight
			}
		});
	});

/**
 * content streamにベクターパス描画コマンドが含まれるか判定
 */
export const hasVectorContent = (contentStream: string): boolean =>
	/\b[SsfFBb]\b|\bf\*|\bB\*|\bb\*/.test(contentStream);

/**
 * content streamにラスター画像描画コマンドが含まれるか判定
 */
export const hasRasterContent = (contentStream: string): boolean =>
	/\bDo\b|\bBI\b/.test(contentStream);
