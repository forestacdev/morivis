<script lang="ts">
	import { onMount } from 'svelte';
	import ColorPicker, { ChromeVariant } from 'svelte-awesome-color-picker';

	import Icon from '$lib/components/svgs/Icon.svelte';
	import MaterialSymbolsDownloadRoundedIcon from '$lib/components/svgs/icons/material-symbols/DownloadRoundedIcon.svelte';
	import type { DrawGeojsonData, DrawMode } from '$routes/map/types/draw';
	import { createDrawRuntime } from '$routes/map/utils/draw/runtime';
	import { downloadGeojson } from '$routes/map/utils/formats/geojson';
	import type { Map } from '$routes/map/utils/maplibre';

	let {
		map,
		drawGeojsonData = $bindable(),
		onclose
	}: {
		map: Map;
		drawGeojsonData: DrawGeojsonData;
		onclose: () => void;
	} = $props();
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
	] as const;

	let runtime: ReturnType<typeof createDrawRuntime> | undefined;
	let mode = $state<DrawMode>('select');
	let ready = $state(false);
	let hasSelection = $state(false);
	let color = $state('#ff0000');

	onMount(() => {
		runtime = createDrawRuntime({
			map,
			data: drawGeojsonData,
			onchange: (data) => {
				drawGeojsonData = data;
			},
			onselect: (feature) => {
				hasSelection = feature !== null;
				if (feature) color = feature.properties.color;
			},
			onready: () => {
				ready = true;
			}
		});
		return () => runtime?.destroy();
	});

	const setMode = (value: DrawMode) => {
		mode = value;
		runtime?.setMode(value);
	};
	const setColor = (value: string) => {
		color = value;
		runtime?.setColor(value);
	};
	const handleKeydown = (event: KeyboardEvent) => {
		if (
			event.target instanceof HTMLElement &&
			event.target.closest('input, textarea, select, [contenteditable="true"]')
		)
			return;
		if (event.key === 'Escape') {
			event.preventDefault();
			setMode('select');
		}
		if ((event.key === 'Delete' || event.key === 'Backspace') && hasSelection) {
			event.preventDefault();
			runtime?.deleteSelected();
		}
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<section
	aria-label="ドローモード"
	class="bg-main absolute right-2 top-16 z-20 flex max-h-[calc(100dvh-150px)] w-72 max-w-[calc(100vw-16px)] flex-col gap-3 overflow-y-auto rounded-xl border border-white/30 p-3 text-white shadow-lg"
>
	<div class="flex items-center justify-between gap-2">
		<h2 class="font-bold">ドローモード</h2>
		<button type="button" class="cursor-pointer rounded border px-3 py-1 text-sm" onclick={onclose}
			>終了</button
		>
	</div>
	<div class="c-color-picker [&_label]:w-full">
		<ColorPicker
			label="色の選択"
			isAlpha={false}
			bind:hex={() => color, setColor}
			components={ChromeVariant}
			sliderDirection="horizontal"
			isDialog={true}
		/>
	</div>
	<div class="grid grid-cols-3 gap-2">
		{#each DRAW_MODE_TYPE as { type, name, icon } (type)}
			<button
				type="button"
				disabled={!ready}
				aria-pressed={mode === type}
				onclick={() => setMode(type)}
				class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md p-2 disabled:opacity-40 {mode ===
				type
					? 'bg-base text-black'
					: 'bg-main text-white'}"
			>
				<Icon {icon} class="h-6 w-6" />
				<span class="text-sm">{name}</span>
			</button>
		{/each}
	</div>
	<p class="text-xs leading-relaxed">
		図形を選んで地図上に描画します。線・面は最後の頂点をもう一度クリックして確定します。選択後はドラッグで編集できます。Escで描画を取り消します。
	</p>
	<p class="text-xs">作成済み: {drawGeojsonData.features.length}件</p>
	<button
		type="button"
		disabled={!hasSelection}
		onclick={() => runtime?.deleteSelected()}
		class="cursor-pointer rounded border p-2 text-sm disabled:cursor-default disabled:opacity-40"
		>選択した図形を削除</button
	>
	{#if drawGeojsonData.features.length > 0}
		<button type="button" onclick={() => downloadGeojson(drawGeojsonData)} class="c-btn-confirm">
			<span class="text-sm">GeoJSONをエクスポート</span>
		</button>
	{/if}
</section>

<style>
	.c-color-picker {
		--cp-bg-color: #333;
		--cp-border-color: white;
		--cp-text-color: white;
		--cp-input-color: #555;
		--cp-button-hover-color: #777;
	}
</style>
