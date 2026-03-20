import { Tile3DLayer } from '@deck.gl/geo-layers';
import { PointCloudLayer } from '@deck.gl/layers';

import type { AnyModelTiles3DEntry, ModelPointCloudEntry } from '../data/types/model';

interface TileContent {
	cartographicOrigin?: number[];
}

interface Tile3D {
	content?: TileContent;
}

const createTiles3DLayer = (dataEntry: AnyModelTiles3DEntry) => {
	const altitudeOffset = dataEntry.metaData.altitude ?? 0;

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
		},
		// 高さオフセットを適用
		onTileLoad: (tile: Tile3D) => {
			if (tile.content?.cartographicOrigin && altitudeOffset !== 0) {
				// Z座標（高さ）にオフセットを加算
				// tile.content.cartographicOrigin[2] -= altitudeOffset;
			}
		}
	});
};

const createPointCloudLayer = (dataEntry: ModelPointCloudEntry) => {
	const { positions, colors, pointCount } = dataEntry.format;
	if (!positions || pointCount === 0) return null;

	// colorsのチャンネル数を判定（RGB=3 or RGBA=4）
	const colorChannels = colors ? Math.round(colors.length / pointCount) : 0;

	// Float32Arrayからオブジェクト配列を生成
	const data = new Array(pointCount);
	for (let i = 0; i < pointCount; i++) {
		const posIdx = i * 3;
		data[i] = {
			position: [positions[posIdx], positions[posIdx + 1], positions[posIdx + 2]] as [number, number, number],
			color: colors
				? colorChannels === 4
					? [colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2], colors[i * 4 + 3]] as [number, number, number, number]
					: [colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2], 255] as [number, number, number, number]
				: [255, 255, 255, 255] as [number, number, number, number]
		};
	}

	return new PointCloudLayer({
		id: `point-cloud-layer-${dataEntry.id}`,
		data,
		getPosition: (d: { position: [number, number, number] }) => d.position,
		getColor: (d: { color: [number, number, number, number] }) => d.color,
		getNormal: [0, 0, 1],
		opacity: dataEntry.style.opacity,
		visible: dataEntry.style.visible ?? true,
		pointSize: dataEntry.style.pointSize ?? 1,
		parameters: { depthTest: false },
		beforeId: 'deck-reference-layer'
	});
};

export const createDeckOverlay = async (
	tiles3dEntries: AnyModelTiles3DEntry[],
	pointCloudEntries: ModelPointCloudEntry[] = []
) => {
	const tiles3dLayers = tiles3dEntries.map((entry) => createTiles3DLayer(entry));
	const pointCloudLayers = pointCloudEntries
		.map((entry) => createPointCloudLayer(entry))
		.filter((layer) => layer !== null);

	return [...tiles3dLayers, ...pointCloudLayers];
};
