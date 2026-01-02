<script lang="ts">
	import maplibregl, { CanvasSource } from 'maplibre-gl';
	import { mapStore } from '$routes/stores/map';
	import { MapboxOverlay } from '@deck.gl/mapbox';
	import { Tile3DLayer } from '@deck.gl/geo-layers';
	import { ENTRY_3DTILES_PATH } from '$routes/constants';

	let map: maplibregl.Map | null = null;

	const TilesLayer = new Tile3DLayer({
		id: '3d-tiles-layer',
		data: ENTRY_3DTILES_PATH + '/ensyurin_owl/tileset.json',
		pickable: true,
		opacity: 0.5,
		pointSize: 1,
		parameters: { depthTest: false }, // 地形を考慮して描画（地形の下も表示）
		beforeId: 'deck-reference-layer', // これ以降に描画されるようにする
		loadOptions: {
			'3d-tiles': { decodeQuantizedPositions: true }
		},
		onTilesetLoad: (tileset) => {
			console.log('3D Tiles loaded:', tileset);
			const { cartographicCenter, zoom } = tileset;
			if (cartographicCenter) {
				// map.flyTo({
				// 	center: [cartographicCenter[0], cartographicCenter[1]],
				// 	zoom: zoom || 15,
				// 	pitch: 60
				// });
			}
		},
		onClick: (info) => {
			if (info.object && info.index !== undefined) {
				const tile = info.object;
				const index = info.index;

				console.log('Clicked point index:', index);

				// 色情報
				if (tile.content?.attributes?.colors?.value) {
					const colors = tile.content.attributes.colors.value;
					const r = colors[index * 3];
					const g = colors[index * 3 + 1];
					const b = colors[index * 3 + 2];
					console.log('Color:', { r, g, b });
				}
			}
		}
	});
</script>

<style>
</style>
