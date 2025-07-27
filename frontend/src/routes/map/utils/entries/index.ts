import type { GeoDataEntry } from '$routes/map/data/types';
// 配列を自動ソートする ラスターが下になるように
export type LayerType = 'point' | 'line' | 'polygon' | 'raster';

/** レイヤータイプの取得 */
export const getLayerType = (_dataEntry: GeoDataEntry): LayerType | undefined => {
	if (_dataEntry.type === 'raster') {
		return 'raster';
	} else if (_dataEntry.type === 'vector') {
		if (_dataEntry.format.geometryType === 'Point') {
			return 'point';
		} else if (_dataEntry.format.geometryType === 'LineString') {
			return 'line';
		} else if (_dataEntry.format.geometryType === 'Polygon') {
			return 'polygon';
		}
	} else {
		throw new Error(`Unknown layer type: ${_dataEntry}`);
	}
};

export const getLayerIcon = (layerType: LayerType): string => {
	switch (layerType) {
		case 'point':
			return 'ic:baseline-mode-standby';
		case 'line':
			return 'ic:baseline-polymer';
		case 'polygon':
			return 'ic:baseline-pentagon';
		case 'raster':
			return 'mdi:raster';
		default:
			throw new Error(`Unknown layer type: ${layerType}`);
	}
};

export const TYPE_LABELS = {
	point: 'ポイント',
	line: 'ライン',
	polygon: 'ポリゴン',
	raster: 'ラスター'
};
