import boundaryStyleJson from '$routes/data/boundary-style.json';
import type { LineLayerSpecification, SourceSpecification } from 'maplibre-gl';

/** 行政区域境界のソースを取得 */
export const getBoundarySources = (): {
	[_: string]: SourceSpecification;
} => {
	return boundaryStyleJson.sources as {
		[_: string]: SourceSpecification;
	};
};

/** 行政区域境界のレイヤーを取得 */
export const getBoundaryLayers = (): LineLayerSpecification[] => {
	return boundaryStyleJson.layers as LineLayerSpecification[];
};
