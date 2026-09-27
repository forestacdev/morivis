import type initGdalJs from 'gdal3.js';
import { type MapInfoResult, MAX_TAB_FEATURES, normalizeMapInfoGeoJson } from '.';

export type Gdal = Awaited<ReturnType<typeof initGdalJs>>;
type Dataset = Awaited<ReturnType<Gdal['open']>>['datasets'][number];
interface VectorInfo {
	driverShortName?: string;
	layers?: {
		featureCount?: number;
		geometryFields?: { coordinateSystem?: { wkt?: string; }; }[];
	}[];
}

/** filesはprepareMapInfoFilesで同じ表だけをASCII名へ正規化済み。 */
export const convertMapInfoTab = async (
	gdal: Gdal,
	files: File[] | string,
	sourceCrs?: string
): Promise<MapInfoResult> => {
	// gdal3.js 2.8.1の型にはFile[]がないが、実装はFileListと同じ経路で扱う。
	const opened = await gdal.open(files as FileList | string);
	let dataset: Dataset | undefined;
	try {
		dataset = opened.datasets.find(item => /\.tab$/i.test(item.path));
		if (!dataset || dataset.type !== 'vector') {
			throw new Error('MapInfo TABの図形を読み込めませんでした');
		}
		const info = await gdal.ogrinfo(dataset, ['-al', '-so']) as VectorInfo;
		if (info.driverShortName !== 'MapInfo File') throw new Error('MapInfo TABではありません');
		if (info.layers?.length !== 1) throw new Error('1つの表で構成されたTABを選択してください');
		if ((info.layers[0].featureCount ?? 0) > MAX_TAB_FEATURES) {
			throw new Error('MapInfo TABは50万地物以下にしてください');
		}
		const sourceWkt = info.layers[0].geometryFields?.[0]?.coordinateSystem?.wkt ?? '';
		const hasCrs = sourceCrs || (sourceWkt && !/^\s*(LOCAL_CS|ENGCRS)\s*\[/i.test(sourceWkt));
		const options = ['-f', 'GeoJSON', '-dim', 'XY'];
		const suffix = crypto.randomUUID();
		const output = await gdal.ogr2ogr(dataset, options, `raw_${suffix}`);
		const raw = normalizeMapInfoGeoJson(
			JSON.parse(new TextDecoder().decode(await gdal.getFileBytes(output))),
			false
		);
		if (!hasCrs) return { ...raw, sourceWkt, spatialStatus: 'crs-missing' };
		try {
			const projected = await gdal.ogr2ogr(dataset, [
				...options,
				...(sourceCrs ? ['-s_srs', sourceCrs] : []),
				'-t_srs',
				'EPSG:4326'
			], `projected_${suffix}`);
			const result = normalizeMapInfoGeoJson(
				JSON.parse(new TextDecoder().decode(await gdal.getFileBytes(projected))),
				true
			);
			if (result.geojson.features.length !== raw.geojson.features.length) {
				throw new Error('座標変換で地物が欠落しました');
			}
			return { ...result, sourceWkt, spatialStatus: 'resolved' };
		} catch (cause) {
			if (sourceCrs) {
				throw new Error(
					`指定した座標系で変換できませんでした: ${
						cause instanceof Error ? cause.message : String(cause)
					}`
				);
			}
			return { ...raw, sourceWkt, spatialStatus: 'crs-missing' };
		}
	} finally {
		for (const item of opened.datasets) await gdal.close(item);
	}
};
