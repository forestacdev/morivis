<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import JSONEditor from 'jsoneditor';
	import 'jsoneditor/dist/jsoneditor.min.css';
	import { mapStore } from '$routes/map/store/map';
	import type { Map } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { GUI } from 'lil-gui';

	let { map, showJsonEditor } = $props();

	let controlContainer: HTMLDivElement;

	// JSONを取得する関数

	onMount(() => {
		if (map && controlContainer) {
			// スケールバーのコントロールを作成

			// controlContainer.appendChild(scaleControl.onAdd(map));

			// タイル境界を表示

			map.showTileBoundaries = true;
			map.showCollisionBoxes = true;
			map.showOverdrawInspector = false;
			map.showPadding = true;

			const mapTriggerRepaint = () => {
				if (map) {
					map.triggerRepaint();
					map.resize();
				}
			};
			const gui = new GUI();
			gui
				.add(map, 'showTileBoundaries')
				.name('タイル境界表示')
				.onChange(() => mapTriggerRepaint);

			gui
				.add(map, 'showCollisionBoxes')
				.name('シンボル境界表示')
				.onChange(() => mapTriggerRepaint);

			gui
				.add(map, 'showOverdrawInspector')
				.name('レンダリング')
				.onChange(() => mapTriggerRepaint);

			gui
				.add(map, 'showPadding')
				.name('境界')
				.onChange(() => mapTriggerRepaint);

			gui
				.add(showJsonEditor, 'value')
				.name('JSON')
				.onChange(() => mapTriggerRepaint);

			gui
				.add(
					{
						button: () => {
							window.open('https://maplibre.org/maplibre-gl-js/docs/API/', '_blank', 'noopener');
						}
					},
					'button'
				)
				.name('doc');

			gui
				.add(
					{
						button: () => {
							window.open(
								'https://maplibre.org/maplibre-style-spec/expressions/',
								'_blank',
								'noopener'
							);
						}
					},
					'button'
				)
				.name('expressions');

			const debug = {
				mouseX: 0,
				mouseY: 0,
				mapZ: 0,
				bboxLeft: 0,
				bboxBottom: 0,
				bboxRight: 0,
				bboxTop: 0
			};

			gui.add(debug, 'mouseX', 0).listen().disable();
			gui.add(debug, 'mouseY', 0).listen().disable();
			gui.add(debug, 'mapZ', 0).listen().disable();
			gui.add(debug, 'bboxLeft', 0).listen().disable();
			gui.add(debug, 'bboxBottom', 0).listen().disable();
			gui.add(debug, 'bboxRight', 0).listen().disable();
			gui.add(debug, 'bboxTop', 0).listen().disable();

			gui
				.add(
					{
						setStyle: () => {
							const style = map.getStyle();
							mapStore.setStyle(style);
						}
					},
					'setStyle'
				)
				.name('setStyle');

			// ファイルの保存

			// map.on('move', () => {
			//     debug.innerHTML = `zoom: ${map.getZoom()}<br>center: ${map.getCenter()}`;
			// });

			map.on('mousemove', (e) => {
				// 座標を取得
				const lngLat = e.lngLat;
				const mercator = maplibregl.MercatorCoordinate.fromLngLat(lngLat);
				debug.mouseX = mercator.x;
				debug.mouseY = mercator.y;
			});
			map.on('zoom', (e) => {
				debug.mapZ = map.getZoom();
			});
			map.on('moveend', (e) => {
				const Bounds = map.getBounds();
				const bbox = [Bounds.getWest(), Bounds.getSouth(), Bounds.getEast(), Bounds.getNorth()];

				debug.bboxLeft = bbox[0];
				debug.bboxBottom = bbox[1];
				debug.bboxRight = bbox[2];
				debug.bboxTop = bbox[3];

				// const mySource = map.getSource('canvas-source') as maplibregl.CanvasSource;
				// mySource.setCoordinates([
				//     [bbox[0], bbox[3]],
				//     [bbox[2], bbox[3]],
				//     [bbox[2], bbox[1]],
				//     [bbox[0], bbox[1]],
				// ]);
				// console.log(bbox);
			});
		}
	});

	onDestroy(() => {});
</script>

<div class="" bind:this={controlContainer}></div>
