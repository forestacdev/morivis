<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { DrawGeojsonData, DrawGeojsonFeature } from '$routes/types/draw';

	import type { GeoDataEntry } from '$routes/data/types';
	import { isSideMenuType } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import Icon from '@iconify/svelte';

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

	interface Props {
		layerEntries: GeoDataEntry[];
		drawGeojsonData: DrawGeojsonData;
	}

	let { layerEntries = $bindable(), drawGeojsonData = $bindable() }: Props = $props();

	let hex = $state<string>('#ae9f66');

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
			type: 'hand',
			name: '手のひら',
			icon: 'bxs:hand'
		}
		// {
		// 	type: 'select',
		// 	name: '選択',
		// 	icon: 'healthicons:polygon'
		// },
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
	let isDrawMode = $state<DrawMode>('point');

	isSideMenuType.subscribe((value) => {
		if (value === 'draw') {
			if (!terraDraw) return;
			if (terraDraw.enabled) return;
			terraDraw.start();
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
				terraDraw.setMode(isDrawMode);
			}
		}
	});

	mapStore.onStyleLoad((_map) => {
		console.log(_map);
		if (!_map) {
			return;
		}
		const adapter = new TerraDrawMapLibreGLAdapter({
			// Pass in the map instance
			map: _map
		});
		// マップのスタイルが読み込まれたときの処理
		terraDraw = new TerraDraw({
			adapter: adapter,
			modes: [
				new TerraDrawSelectMode({
					moduleName: 'select'
				}),
				new TerraDrawPointMode({
					modeName: 'point'
				}),
				new TerraDrawLineStringMode({
					modeName: 'linestring'
				}),
				new TerraDrawPolygonMode({
					modeName: 'polygon'
				}),
				new TerraDrawCircleMode({
					modeName: 'circle' // 円
				}),
				new TerraDrawSectorMode({
					modeName: 'sector' // 円弧
				}),
				new TerraDrawSensorMode({
					modeName: 'sensor' // センサー
				}),
				new TerraDrawRectangleMode({
					modeName: 'rectangle' // 矩形
				}),
				new TerraDrawAngledRectangleMode({
					modeName: 'angled-rectangle' // 角度付き矩形
				}),
				new TerraDrawFreehandMode({
					modeName: 'freehand' // 自由描画
				}),

				new TerraDrawRenderMode({
					modeName: 'hand' // 手のひら
				})
			]
		});

		terraDraw.on('finish', (id: string, context: { action: string; mode: string }) => {
			if (terraDraw && terraDraw.enabled) {
				if (context.action === 'draw') {
					const newFeature = terraDraw.getSnapshotFeature(id);
					const copyFeature = JSON.parse(JSON.stringify(newFeature));
					const feature = {
						type: 'Feature',
						id: copyFeature.id,
						geometry: copyFeature.geometry,
						properties: {
							id: copyFeature.id,
							color: hex,
							opacity: 1
						}
					};
					drawGeojsonData.features.push(feature as DrawGeojsonFeature);
					terraDraw.clear(id);
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
	});
</script>

<!-- レイヤーメニュー -->
{#if $isSideMenuType === 'draw'}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main w-side-menu absolute z-10 flex h-full flex-col gap-2 pt-[70px]"
	>
		<div class="text-white">書き込みツール</div>
		<div class="grid grid-cols-3 gap-2 p-2">
			{#each DRAW_MODE_TYPE as { type, name, icon }}
				<label
					class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg p-2 transition-colors duration-150 {isDrawMode ===
					type
						? 'bg-base text-black'
						: 'bg-sub text-white'}"
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
		<ColorPicker
			bind:hex
			components={ChromeVariant}
			sliderDirection="horizontal"
			isDialog={false}
		/>
		<div
			class="c-fog pointer-events-none absolute bottom-0 z-10 flex h-[100px] w-full items-end justify-center pb-4"
		></div>
	</div>
{/if}

<style>
	.c-fog {
		background: rgb(233, 233, 233);
		background: linear-gradient(0deg, rgb(0, 93, 3) 10%, rgba(233, 233, 233, 0) 100%);
	}
</style>
