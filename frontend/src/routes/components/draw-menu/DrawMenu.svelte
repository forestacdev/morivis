<script lang="ts">
	import Icon from '@iconify/svelte';
	import { hex } from 'chroma-js';
	import { fly } from 'svelte/transition';
	import ColorPicker, { ChromeVariant } from 'svelte-awesome-color-picker';
	import {
		TerraDraw,
		TerraDrawAngledRectangleMode,
		TerraDrawCircleMode,
		TerraDrawFreehandMode,
		TerraDrawLineStringMode,
		TerraDrawPointMode,
		TerraDrawPolygonMode,
		TerraDrawRectangleMode,
		TerraDrawRenderMode,
		TerraDrawSectorMode,
		TerraDrawSelectMode,
		TerraDrawSensorMode
	} from 'terra-draw';
	import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';

	import type { GeoDataEntry } from '$routes/data/types';
	import { mapStore } from '$routes/store/map';
	import { isSideMenuType } from '$routes/store/ui';
	import type { DrawGeojsonData, DrawGeojsonFeature } from '$routes/types/draw';
	import { downloadGeojson } from '$routes/utils/file/geojson';

	interface Props {
		layerEntries: GeoDataEntry[];
		drawGeojsonData: DrawGeojsonData;
	}

	let { layerEntries = $bindable(), drawGeojsonData = $bindable() }: Props = $props();

	export const TERRA_DRAW_DEFAULT_SELECT_FLAGS = {
		feature: {
			draggable: true,
			coordinates: {
				deletable: true,
				midpoints: true,
				draggable: true
			}
		}
	};

	const DRAW_MODE_TYPE = [
		{
			type: 'point',
			name: 'ポイント',
			icon: 'tabler:point-filled'
		},
		{
			type: 'linestring',
			name: 'ライン',
			icon: 'fe:line-chart'
		},
		{
			type: 'polygon',
			name: 'ポリゴン',
			icon: 'healthicons:polygon'
		},
		{
			type: 'circle',
			name: '円',
			icon: 'mdi:circle-outline'
		},
		{
			type: 'sector',
			name: '円弧',
			icon: 'mingcute:sector-line'
		},

		{
			type: 'rectangle',
			name: '矩形',
			icon: 'material-symbols:rectangle-outline-rounded'
		},

		{
			type: 'freehand',
			name: '自由描画',
			icon: 'majesticons:edit-pen-4'
		},
		{
			type: 'select',
			name: '選択',
			icon: 'grommet-icons:select'
		}

		// {
		// 	type: 'angled-rectangle',
		// 	name: '角度付き矩形',
		// 	icon: 'healthicons:polygon'
		// },
		// {
		// 	type: 'sensor',
		// 	name: 'センサー'
		// }
	] as const;

	type DrawMode = (typeof DRAW_MODE_TYPE)[number]['type'];

	let terraDraw = $state<TerraDraw | null>(null);
	let isDrawMode = $state<DrawMode>('select');
	let selectedFeatureId = $state<string | null>(null);
	let selectedFeature = $state<DrawGeojsonFeature | null>(null);
	let color = $state<string>('#ff0000');

	isSideMenuType.subscribe((value) => {
		if (value === 'draw') {
			if (!terraDraw) return;
			if (terraDraw.enabled) return;
			terraDraw.start();
			terraDraw.setMode(isDrawMode);
		} else {
			if (!terraDraw) return;
			if (terraDraw.enabled) {
				terraDraw.stop();
			}
		}
	});

	$effect(() => {
		if (isDrawMode) {
			if (!terraDraw) return;
			if (terraDraw.enabled) {
				terraDraw.clear();
				terraDraw.setMode(isDrawMode);
			}
		}
	});

	const setColor = (newColor: string) => {
		if (isDrawMode === 'select') {
			if (!terraDraw) return;
			if (terraDraw.enabled && selectedFeatureId && terraDraw.hasFeature(selectedFeatureId)) {
				console.log('newColor', newColor);
				console.log('selectedFeature', selectedFeatureId);
				// 対象のフィーチャーの色を変更
				if (drawGeojsonData.features) {
					const newFeatures = drawGeojsonData.features.map((f) => {
						if (f.properties.id === selectedFeatureId) {
							f.properties.color = newColor;
						}
						return f;
					});
				}
			}
		}
	};

	$effect(() => {
		if (color) {
			setColor(color);
		}
	});

	mapStore.onStyleLoad((_map) => {
		if (!_map) return;
		const adapter = new TerraDrawMapLibreGLAdapter({
			map: _map
		});

		terraDraw = new TerraDraw({
			adapter: adapter,
			modes: [
				new TerraDrawSelectMode({
					flags: {
						point: TERRA_DRAW_DEFAULT_SELECT_FLAGS,
						linestring: TERRA_DRAW_DEFAULT_SELECT_FLAGS,
						polygon: TERRA_DRAW_DEFAULT_SELECT_FLAGS,
						freehand: TERRA_DRAW_DEFAULT_SELECT_FLAGS,
						circle: TERRA_DRAW_DEFAULT_SELECT_FLAGS,
						rectangle: TERRA_DRAW_DEFAULT_SELECT_FLAGS,
						sector: TERRA_DRAW_DEFAULT_SELECT_FLAGS,
						sensor: TERRA_DRAW_DEFAULT_SELECT_FLAGS,
						'angled-rectangle': TERRA_DRAW_DEFAULT_SELECT_FLAGS
					}
				}),
				new TerraDrawPointMode(),
				new TerraDrawLineStringMode(),
				new TerraDrawPolygonMode(),
				new TerraDrawCircleMode(),
				new TerraDrawSectorMode(),
				new TerraDrawRectangleMode(),
				new TerraDrawFreehandMode()
				// new TerraDrawAngledRectangleMode()// 角度付き矩形
				// new TerraDrawSensorMode() // センサー
				// new TerraDrawRenderMode()
			]
		});

		terraDraw.on('finish', (id, context) => {
			if (terraDraw && terraDraw.enabled) {
				if (context.action === 'draw') {
					// const newFeature = terraDraw.selectFeature(id);
					const newFeatures = terraDraw.getSnapshot();
					const copyFeature = JSON.parse(JSON.stringify(newFeatures[0]));
					const feature = {
						type: 'Feature',
						id: copyFeature.id,
						geometry: copyFeature.geometry,
						properties: {
							id: copyFeature.id,
							color,
							opacity: 1,
							mode: context.mode
						}
					};
					drawGeojsonData.features.push(feature as DrawGeojsonFeature);
					terraDraw.clear();
				}
			}
			// if (context.action === 'draw') {
			// 	// Do something for draw finish event
			// } else if (context.action === 'dragFeature') {
			// 	// Do something for a drag finish event
			// } else if (context.action === 'dragCoordinate') {
			// 	//
			// } else if (context.action === 'dragCoordinateResize') {
			// 	//
			// }
		});

		_map.on('click', (e) => {
			if (isDrawMode !== 'select') return;
			if (terraDraw && terraDraw.enabled) {
				terraDraw.clear();
				selectedFeatureId = null;
			}
			const feature = _map.queryRenderedFeatures(e.point, {
				layers: ['@draw_fill_layer', '@draw_line_layer', '@draw_circle_layer']
			});

			if (feature.length > 0) {
				const clickedFeature = feature[0];
				const clickedFeatureId = clickedFeature.properties.id;

				const targetFeature = drawGeojsonData.features.find(
					(f) => f.properties.id === clickedFeatureId
				) as DrawGeojsonFeature;

				terraDraw?.addFeatures([targetFeature]);
				color = targetFeature.properties.color;
				selectedFeatureId = clickedFeatureId;
			}
		});
	});

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			if (terraDraw && terraDraw.enabled) {
				terraDraw.clear();
			}
		}
		if (e.key === 'Delete') {
			if (terraDraw && terraDraw.enabled) {
				const newFeatures = terraDraw.getSnapshot();
				const copyFeature = newFeatures[0];
				const id = copyFeature.id;
				drawGeojsonData.features = drawGeojsonData.features.filter((f) => f.properties.id !== id);
				terraDraw.clear();
			}
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- レイヤーメニュー -->
{#if $isSideMenuType === 'draw'}
	<div
		transition:fly={{ duration: 300, y: 100, opacity: 0, delay: 100 }}
		class="w-side-menu absolute z-10 flex h-full flex-col gap-2 pt-[70px]"
	>
		<div class="c-color-picker [&_label]:w-full">
			<ColorPicker
				label="色の選択"
				bind:hex={color}
				components={ChromeVariant}
				sliderDirection="horizontal"
				isDialog={true}
			/>
		</div>
		<div class="grid grid-cols-3 gap-4 p-2">
			{#each DRAW_MODE_TYPE as { type, name, icon }}
				<label
					class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md p-2 drop-shadow-[0_0_2px_rgba(220,220,220,0.8)] transition-colors duration-150 {isDrawMode ===
					type
						? 'bg-base text-black'
						: 'bg-main text-white'}"
				>
					<Icon {icon} class="h-6 w-6" />
					<span class="text-sm">{name}</span>
					<input
						type="radio"
						name="draw-mode"
						bind:group={isDrawMode}
						value={type}
						class="hidden"
					/>
				</label>
			{/each}
		</div>

		<div class="p-2">
			{#if drawGeojsonData.features.length > 0}
				<button
					onclick={() => (drawGeojsonData ? downloadGeojson(drawGeojsonData) : null)}
					class="c-btn-confirm max-w-[300px]"
				>
					<Icon icon="material-symbols:save-alt-rounded" class="h-8 w-8" />
					<span class="text-sm">エクスポート</span>
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.c-color-picker {
		--cp-bg-color: #333;
		--cp-border-color: white;
		--cp-text-color: white;
		--cp-input-color: #555;
		--cp-button-hover-color: #777;
	}
</style>
