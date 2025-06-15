import labelStyleJson from '$routes/data/label-style.json';
import type { SymbolLayerSpecification, SourceSpecification } from 'maplibre-gl';

/** ラベルのソースを取得 */
export const getLabelSources = (): {
	[_: string]: SourceSpecification;
} => {
	return labelStyleJson.sources as {
		[_: string]: SourceSpecification;
	};
};

/** ラベルのレイヤーを取得 */
export const getLabelLayers = (): SymbolLayerSpecification[] => {
	return labelStyleJson.layers as SymbolLayerSpecification[];
};
