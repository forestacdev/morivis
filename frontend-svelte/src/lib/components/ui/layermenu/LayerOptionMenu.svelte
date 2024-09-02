<script lang="ts">
	import Icon from '@iconify/svelte';
	export let layerDataEntries: LayerEntry[];
	import { showlayerOptionId, isSide } from '$lib/store/store';
	import { fade, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	isSide.subscribe((value) => {
		if (value !== 'vector') {
			showlayerOptionId.set(null);
		}
	});

	let layerOption: any;
	$: layerOption = layerDataEntries.find((layer) => layer.id === $showlayerOptionId);

	$: console.log(layerOption);
</script>

<div
	class="custom-css bg-color-base absolute left-[380px] top-[60px] w-[200px] rounded-sm p-2 text-slate-100 shadow-2xl transition-all duration-200 {$showlayerOptionId
		? ''
		: 'pointer-events-none -translate-x-[100px] opacity-0'}"
>
	{#if $showlayerOptionId}
		<div class="flex flex-col gap-2">
			<label class="block">透過度</label>
			<input
				type="range"
				class="custom-slider"
				bind:value={layerOption.opacity}
				min="0"
				max="1"
				step="0.01"
			/>
		</div>
		{#if layerOption.show_label !== undefined}
			<div class="flex gap-2">
				<label class="block">ラベル</label>
				<input
					type="checkbox"
					class="custom-checkbox"
					bind:checked={layerOption.show_label}
				/>
			</div>
		{/if}
		{#if layerOption.show_outline !== undefined}
			<div class="flex gap-2">
				<label class="block">アウトライン</label>
				<input
					type="checkbox"
					class="custom-checkbox"
					bind:checked={layerOption.show_outline}
				/>
			</div>
		{/if}
		{#if layerOption.show_fill !== undefined}
			<div class="flex gap-2">
				<label class="block">塗りつぶし</label>
				<input
					type="checkbox"
					class="custom-checkbox"
					bind:checked={layerOption.show_fill}
				/>
			</div>
		{/if}

		{#if layerOption.type === 'raster'}
			<!-- TODO: -->
		{:else if layerOption.type === 'geojson-polygon' || layerOption.type === 'vector-polygon'}
			<div class="flex flex-col gap-2">
				<select
					class="custom-select {!layerOption.show_fill ? 'opacity-50' : ''}"
					bind:value={layerOption.style_key}
					disabled={!layerOption.show_fill}
				>
					{#each layerOption.style.fill as item (item)}
						<option value={item.name}>{item.name}</option>
					{/each}
				</select>
			</div>
			{#if layerOption.style_key === '単色'}
				<div class="flex gap-2">
					<label class="block">色</label>
					<input
						type="color"
						class="custom-color"
						bind:value={layerOption.style.fill[0].paint['fill-color']}
					/>
				</div>
			{/if}
		{:else if layerOption.type === 'geojson-line' || layerOption.type === 'vector-line'}
			<div class="flex flex-col gap-2">
				<select class="custom-select" bind:value={layerOption.style_key}>
					{#each layerOption.style.line as item (item)}
						<option value={item.name}>{item.name}</option>
					{/each}
				</select>
			</div>
			{#if layerOption.style_key === '単色'}
				<div class="flex gap-2">
					<label class="block">色</label>
					<input
						type="color"
						class="custom-color"
						bind:value={layerOption.style.line[0].paint['line-color']}
					/>
				</div>
			{/if}
		{:else if layerOption.type === 'geojson-circle' || layerOption.type === 'vector-circle'}
			<div class="flex flex-col gap-2">
				<select class="custom-select" bind:value={layerOption.style_key}>
					{#each layerOption.style.circle as item (item)}
						<option value={item.name}>{item.name}</option>
					{/each}
				</select>
			</div>
			{#if layerOption.style_key === '単色'}
				<div class="flex gap-2">
					<label class="block">色</label>
					<input
						type="color"
						class="custom-color"
						bind:value={layerOption.style.circle[0].paint['circle-color']}
					/>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
</style>
