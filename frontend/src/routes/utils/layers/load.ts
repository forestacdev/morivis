import loadStyleJson from '$routes/data/load-style.json';
import type { LineLayerSpecification, SourceSpecification } from 'maplibre-gl';

/** ラベルのソースを取得 */
export const getLoadSources = (): {
	[_: string]: SourceSpecification;
} => {
	return loadStyleJson.sources as {
		[_: string]: SourceSpecification;
	};
};

/** ラベルのレイヤーを取得 */
export const getLoadLayers = (): LineLayerSpecification[] => {
	return loadStyleJson.layers as LineLayerSpecification[];
};
