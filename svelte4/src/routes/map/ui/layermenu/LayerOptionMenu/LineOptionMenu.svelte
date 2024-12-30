<script lang="ts">
	import type { LineLayerOptions, LinePattern } from '$routes/map/data/types';
	import type { LineLayerSpecification } from 'maplibre-gl';
	import { isMatchStyle, isSingleStyle, isInterpolateStyle } from '$routes/map/data/expression';
	export let lineStyle: LineLayerOptions<
		LineLayerSpecification['paint'],
		LineLayerSpecification['layout']
	>;
	export let lineStyleKey: string | undefined;
	export let layerType: 'fill' | 'line' | 'circle' | 'symbol' | undefined;

	const linePatternObj: Record<string, LinePattern> = {
		実線: 'solid',
		破線: 'dashed'
	};
</script>

{#if lineStyle.show && Object.keys(lineStyle.color).length > 1}
	<div class="flex flex-col gap-2">
		<select
			class="custom-select {!lineStyle.show ? 'opacity-50' : ''}"
			bind:value={lineStyle.styleKey}
			disabled={!lineStyle.show}
		>
			{#each Object.keys(lineStyle.color) as item (item)}
				<option value={item}>{item}</option>
			{/each}
		</select>
	</div>
{/if}
{#if lineStyleKey && isSingleStyle(lineStyle.color[lineStyleKey])}
	<div class="flex gap-2">
		<label class="block">色</label>
		<input
			type="color"
			class="custom-color"
			bind:value={lineStyle.color[lineStyleKey].values.default}
		/>
	</div>
{:else if lineStyleKey && isMatchStyle(lineStyle.color[lineStyleKey])}
	{#each Object.entries(lineStyle.color[lineStyleKey].values.categories) as [key, value]}
		<div class="flex w-full items-center">
			<div class="w-full text-sm">{key}</div>
			<input
				type="checkbox"
				value={key}
				bind:group={lineStyle.color[lineStyleKey].values.showCategories}
			/>

			<input
				type="color"
				class="custom-color"
				bind:value={lineStyle.color[lineStyleKey].values.categories[key]}
			/>
		</div>
	{/each}
{:else if lineStyleKey && isInterpolateStyle(lineStyle.color[lineStyleKey])}
	{#each Object.entries(lineStyle.color[lineStyleKey].values.stops) as [key, value]}
		<div class="flex w-full items-center">
			<div class="w-full text-sm">{key}</div>

			<input
				type="color"
				class="custom-color"
				bind:value={lineStyle.color[lineStyleKey].values.stops[key]}
			/>
		</div>
	{/each}
{/if}
<div class="flex gap-2">
	<label class="block">線のスタイル</label>
	<select
		class="custom-select {!lineStyle.show ? 'opacity-50' : ''}"
		bind:value={lineStyle.linePattern}
		disabled={!lineStyle.show}
	>
		{#each Object.entries(linePatternObj) as [key, value] (key)}
			<option {value}>{key}</option>
		{/each}
	</select>
</div>
<div class="flex gap-2">
	<label class="block">線の幅</label>
	<select
		class="custom-select {!lineStyle.show ? 'opacity-50' : ''}"
		bind:value={lineStyle.lineWidth.type}
		disabled={!lineStyle.show}
	>
		{#each Object.entries(lineStyle.lineWidth.values) as [key, value] (key)}
			<option {key}>{key}</option>
		{/each}
	</select>
</div>
{#if lineStyle.lineWidth.type === 'custom'}
	<input
		type="range"
		class="custom-slider"
		bind:value={lineStyle.lineWidth.values.custom}
		min="0"
		max="10"
		step="0.01"
	/>
{/if}

<style>
</style>
