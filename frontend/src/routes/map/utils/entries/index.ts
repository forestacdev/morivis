import type { GeoDataEntry } from '$routes/map/data/types';
import { getLayerIconName } from '$lib/icons';
// 配列を自動ソートする ラスターが下になるように
export type LayerType = 'model' | 'point' | 'line' | 'polygon' | 'raster';

/** レイヤータイプの取得 */
export const getLayerType = (_dataEntry: GeoDataEntry): LayerType | undefined => {
	if (_dataEntry.type === 'raster') {
		if (_dataEntry.style.type === 'cad') {
			return 'line';
		} else {
			return 'raster';
		}
	} else if (_dataEntry.type === 'vector') {
		if (_dataEntry.format.geometryType === 'Point') {
			return 'point';
		} else if (_dataEntry.format.geometryType === 'LineString') {
			return 'line';
		} else if (_dataEntry.format.geometryType === 'Polygon') {
			return 'polygon';
		}
	} else if (_dataEntry.type === 'model') {
		return 'model';
	} else {
		console.error('不明なデータエントリタイプです。');
		throw new Error(`Unknown layer type: ${_dataEntry}`);
	}
};

export const getLayerIcon = (layerType: LayerType): string => {
	return getLayerIconName(layerType);
};

export const TYPE_LABELS = {
	model: '3Dモデル',
	point: 'ポイント',
	line: 'ライン',
	polygon: 'ポリゴン',
	raster: 'ラスター'
};
