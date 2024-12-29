<script lang="ts">
	import type { FillLayerOptions } from '$routes/map/data/types';
	import type { FillLayerSpecification } from 'maplibre-gl';
	export let fillStyle: FillLayerOptions<
		FillLayerSpecification['paint'],
		FillLayerSpecification['layout']
	>;
	import { isMatchStyle, isSingleStyle, isInterpolateStyle } from '$routes/map/data/expression';
	export let fillStyleKey: string | undefined;
</script>

<div class="flex gap-2">
	<label class="block">塗りつぶし</label>
	<input type="checkbox" class="custom-checkbox" bind:checked={fillStyle.show} />
</div>
{#if fillStyle.show}
	<div class="flex flex-col gap-2">
		<select
			class="custom-select {!fillStyle.show ? 'opacity-50' : ''}"
			bind:value={fillStyle.styleKey}
			disabled={!fillStyle.show}
		>
			{#each Object.keys(fillStyle.color) as item (item)}
				<option value={item}>{item}</option>
			{/each}
		</select>
	</div>
	{#if fillStyleKey && isSingleStyle(fillStyle.color[fillStyleKey])}
		<div class="flex gap-2">
			<label class="block">色</label>
			<input
				type="color"
				class="custom-color"
				bind:value={fillStyle.color[fillStyleKey].values.default}
			/>
		</div>
	{:else if fillStyleKey && isMatchStyle(fillStyle.color[fillStyleKey])}
		{#each Object.entries(fillStyle.color[fillStyleKey].values.categories) as [key, value]}
			<div class="flex w-full items-center">
				<div class="w-full text-sm">{key}</div>
				<input
					type="checkbox"
					value={key}
					bind:group={fillStyle.color[fillStyleKey].values.showCategories}
				/>

				<input
					type="color"
					class="custom-color"
					bind:value={fillStyle.color[fillStyleKey].values.categories[key]}
				/>
			</div>
		{/each}
	{:else if fillStyleKey && isInterpolateStyle(fillStyle.color[fillStyleKey])}
		{#each Object.entries(fillStyle.color[fillStyleKey].values.stops) as [key, value]}
			<div class="flex w-full items-center">
				<div class="w-full text-sm">{key}</div>

				<input
					type="color"
					class="custom-color"
					bind:value={fillStyle.color[fillStyleKey].values.stops[key]}
				/>
			</div>
		{/each}
	{/if}{/if}

<style>
</style>
