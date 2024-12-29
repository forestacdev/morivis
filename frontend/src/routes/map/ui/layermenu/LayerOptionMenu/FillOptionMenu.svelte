<script lang="ts">
	import type { FillLayerOptions } from '$routes/map/data/types';
	import type { FillLayerSpecification } from 'maplibre-gl';
	export let fillStyle: FillLayerOptions<
		FillLayerSpecification['paint'],
		FillLayerSpecification['layout']
	>;
	import { isMatchStyle, isSingleStyle, isInterpolateStyle } from '$routes/map/data/expression';
	export let fillStyleKey: string;
	import CheckBox from '$routes/map/ui/atoms/CheckBox.svelte';
	import SelectBox from '$routes/map/ui/atoms/SelectBox.svelte';
	import ColorPicker from '$routes/map/ui/atoms/ColorPicker.svelte';

	$: colorStyle = fillStyle.color[fillStyleKey];
</script>

<div class="h-full">
	<CheckBox bind:value={fillStyle.show} label="塗りつぶし" />
	{#if fillStyle.show}
		{#if Object.keys(fillStyle.color).length > 1}
			<SelectBox bind:value={fillStyle.styleKey} options={Object.keys(fillStyle.color)} />
		{/if}
		{#if colorStyle && isSingleStyle(colorStyle)}
			<ColorPicker label="色" bind:value={colorStyle.values.default} />
		{:else if fillStyleKey && isMatchStyle(colorStyle)}
			{#each Object.keys(colorStyle.values.categories) as key (key)}
				<div class="flex w-full items-center">
					<!-- NOTE:groupはコンポーネント化でいない https://qiita.com/H40831/items/537a6df3dd30fe7bc91a -->
					<div class="w-full text-sm">{key}</div>
					<input
						type="checkbox"
						value={key}
						bind:group={colorStyle.values.showCategories}
					/>
					<ColorPicker bind:value={colorStyle.values.categories[key]} />
				</div>
			{/each}
		{:else if fillStyleKey && isInterpolateStyle(colorStyle)}
			{#each Object.keys(colorStyle.values.stops) as key (key)}
				<div class="flex w-full items-center">
					<ColorPicker label={key} bind:value={colorStyle.values.stops[key]} />
				</div>
			{/each}
		{/if}
	{/if}
</div>

<style>
</style>
