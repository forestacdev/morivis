import type { LayerSpecification, SourceSpecification } from '$routes/map/utils/maplibre';

import type { BaseMetaData } from '$routes/map/data/types';

export interface StyleJsonStyle {
	type: 'stylejson';
	opacity: 1 | 0.7 | 0.5 | 0.3;
	visible?: boolean;
}

export interface StyleJsonInteraction {
	clickable: false;
}

export interface StyleJsonEntry {
	id: string;
	type: 'stylejson';
	// TODO: style.json の実ランタイム実装は一旦見送る。型定義だけ残して再設計時の土台にする。
	metaData: BaseMetaData;
	interaction: StyleJsonInteraction;
	format: {
		type: 'stylejson';
		sources: Record<string, SourceSpecification>;
		layers: LayerSpecification[];
	};
	style: StyleJsonStyle;
}
