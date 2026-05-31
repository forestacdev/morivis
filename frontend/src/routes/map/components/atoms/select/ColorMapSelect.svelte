<script lang="ts">
	import type { Snippet } from 'svelte';

	import BaseSelectMenu from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import type { ColorMapType } from '$routes/map/data/types/raster';

	interface Props {
		isColorMap: ColorMapType;
		mutableColorMapType: ColorMapType[];
		children: Snippet<[ColorMapType]>;
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
<BaseSelectMenu items={colorMapItems} bind:selectedKey={isColorMap}>
	{#snippet triggerContent(item)}
		<div class="flex w-full items-center justify-center gap-2">
			<span class="w-[270px] pl-1 text-start select-none">{item.name}</span>
			{@render children(item.key as ColorMapType)}
		</div>
	{/snippet}

	{#snippet itemContent(item)}
		<div class="flex w-full items-center justify-center gap-2">
			<span class="w-[290px] pl-1 select-none">{item.name}</span>
			{@render children(item.key as ColorMapType)}
			<div class="px-[10px]"></div>
		</div>
	{/snippet}
</BaseSelectMenu>

<style>
</style>
