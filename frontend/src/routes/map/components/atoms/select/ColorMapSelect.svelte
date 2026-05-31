<script lang="ts">
	import type { Snippet } from 'svelte';

	import BaseSelectMenu from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import type { ColorMapType } from '$routes/map/data/types/raster';

	interface Props {
		showLabel?: boolean;
		isColorMap: ColorMapType;
		mutableColorMapType: ColorMapType[];
		children: Snippet<[ColorMapType]>;
	}
	let {
		showLabel = true,
		isColorMap = $bindable(),
		mutableColorMapType,
		children
	}: Props = $props();
	let colorMapItems = $derived.by(() => {
		return mutableColorMapType.map((key) => ({
			key,
			name: key
		}));
	});
</script>

<div>
	{#if showLabel}
		<div class="text-base">カラーランプ</div>
	{/if}
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
</div>

<style>
</style>
