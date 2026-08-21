/**
 * Format spec:
 * - https://nlftp.mlit.go.jp/ksj/ksj_dataformat.html
 *
 * References:
 * - https://nlftp.mlit.go.jp/ksj/jpgis/jpgis_datalist.html
 */
import type { FeatureCollection } from '$routes/map/types/geojson';

import { parseGenericGml } from './generic';

/**
 * 国土数値情報は応用スキーマやコードリストの癖が強いので、
 * parser の責務だけは汎用 GML から分離しておく。
 */
export const parseKsjGml = async (text: string): Promise<FeatureCollection> => parseGenericGml(text);
