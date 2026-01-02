import { Tile3DLayer } from '@deck.gl/geo-layers';

import type { AnyModelTiles3DEntry } from '../data/types/model';

const createTiles3DLayer = (dataEntry: AnyModelTiles3DEntry) => {
	return new Tile3DLayer({
		id: `3d-tiles-layer-${dataEntry.id}`,
		data: dataEntry.format.url,
		pickable: dataEntry.interaction.clickable,
		opacity: dataEntry.style.opacity,
		visible: dataEntry.style.visible ?? true,
		pointSize:
			dataEntry.style.type === 'point-cloud' ? (dataEntry.style.pointSize ?? 1) : undefined,
		parameters: { depthTest: false }, // 地形を考慮して描画（地形の下も表示）
		beforeId: 'deck-reference-layer', // これ以降に描画されるように
		loadOptions: {
			'3d-tiles': { decodeQuantizedPositions: true }
		}
	});
};

export const createDeckOverlay = async (_dataEntries: AnyModelTiles3DEntry[]) => {
	const layers = _dataEntries.map((entry) => createTiles3DLayer(entry));

	return layers;
};
