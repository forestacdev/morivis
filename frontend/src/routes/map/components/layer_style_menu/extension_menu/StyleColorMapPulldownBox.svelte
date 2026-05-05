<script lang="ts">
	import PulldownSelectBox from '$routes/map/components/atoms/PulldownSelectBox.svelte';
	import type { Snippet } from 'svelte';

	import { type ColorMapType } from '$routes/map/data/types/raster';
	import { type SequentialScheme } from '$routes/map/utils/color/color-brewer';

	interface Props {
		isColorMap: ColorMapType | SequentialScheme;
		mutableColorMapType: (ColorMapType | SequentialScheme)[];
		children: Snippet<[ColorMapType | SequentialScheme]>;
	}
	let { isColorMap = $bindable(), mutableColorMapType, children }: Props = $props();
	let colorMapItems = $derived.by(() => {
		return mutableColorMapType.map((key) => ({
			key,
			name: key
		}));
	});
</script>

<h2 class="text-base">カラーランプ</h2>
<PulldownSelectBox items={colorMapItems} bind:selectedKey={isColorMap}>
	{#snippet triggerContent(item)}
		<div class="flex w-full items-center justify-center gap-2">
			<span class="w-[270px] pl-1 text-start select-none">{item.name}</span>
			{@render children(item.key as ColorMapType | SequentialScheme)}
		</div>
	{/snippet}

	{#snippet itemContent(item)}
		<div class="flex w-full items-center justify-center gap-2">
			<span class="w-[290px] pl-1 select-none">{item.name}</span>
			{@render children(item.key as ColorMapType | SequentialScheme)}
			<div class="px-[10px]"></div>
		</div>
	{/snippet}
</PulldownSelectBox>

<style>
</style>
