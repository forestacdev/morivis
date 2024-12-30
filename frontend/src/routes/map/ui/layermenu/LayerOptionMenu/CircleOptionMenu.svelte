<script lang="ts">
	import type { CircleLayerOptions } from '$routes/map/data/types';
	import type { CircleLayerSpecification } from 'maplibre-gl';
	import { isMatchStyle, isSingleStyle, isInterpolateStyle } from '$routes/map/data/expression';
	export let circleStyle: CircleLayerOptions<
		CircleLayerSpecification['paint'],
		CircleLayerSpecification['layout']
	>;
	export let circleStyleKey: string | undefined;
	export let layerType: 'fill' | 'line' | 'circle' | 'symbol' | undefined;

	console.log(circleStyleKey && isSingleStyle(circleStyle.color[circleStyleKey]));
</script>

{#if Object.keys(circleStyle.color).length > 1}
	<div class="flex flex-col gap-2">
		<select
			class="custom-select {!circleStyle.show ? 'opacity-50' : ''}"
			bind:value={circleStyle.styleKey}
			disabled={!circleStyle.show}
		>
			{#each Object.keys(circleStyle.color) as item (item)}
				<option value={item}>{item}</option>
			{/each}
		</select>
	</div>
{/if}
{#if circleStyleKey && isSingleStyle(circleStyle.color[circleStyleKey])}
	<div class="flex gap-2">
		<label class="block">色</label>
		<input
			type="color"
			class="custom-color"
			bind:value={circleStyle.color[circleStyleKey].values.default}
		/>
	</div>
{:else if circleStyleKey && isMatchStyle(circleStyle.color[circleStyleKey])}
	{#each Object.entries(circleStyle.color[circleStyleKey].values.categories) as [key, value]}
		<div class="flex w-full items-center">
			<div class="w-full text-sm">{key}</div>
			<input
				type="checkbox"
				value={key}
				bind:group={circleStyle.color[circleStyleKey].values.showCategories}
			/>

			<input
				type="color"
				class="custom-color"
				bind:value={circleStyle.color[circleStyleKey].values.categories[key]}
			/>
		</div>
	{/each}
{:else if circleStyleKey && isInterpolateStyle(circleStyle.color[circleStyleKey])}
	{#each Object.entries(circleStyle.color[circleStyleKey].values.stops) as [key, value]}
		<div class="flex w-full items-center">
			<div class="w-full text-sm">{key}</div>

			<input
				type="color"
				class="custom-color"
				bind:value={circleStyle.color[circleStyleKey].values.stops[key]}
			/>
		</div>
	{/each}
{/if}

<style>
</style>
