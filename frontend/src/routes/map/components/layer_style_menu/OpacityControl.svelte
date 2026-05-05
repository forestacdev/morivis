<script lang="ts">
	import Icon from '@iconify/svelte';

	import { getVisibilityIconName } from '$lib/icons';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { Opacity } from '$routes/map/data/types';
	import { getBaseMapImageUrl } from '$routes/map/utils/image/vector';

	interface Props {
		layerEntry: GeoDataEntry;
		previewSrc?: string;
	}

	let { layerEntry, previewSrc }: Props = $props();

	interface OpacityButton {
		label: string;
		value: Opacity;
	}

	const opacityButtons: OpacityButton[] = [
		{
			label: '30％',
			value: 0.3
		},
		{
			label: '50％',
			value: 0.5
		},
		{
			label: '70％',
			value: 0.7
		},
		{
			label: '100％',
			value: 1
		}
	];

	const hideLayer = () => {
		layerEntry.style.visible = false;
	};

	const applyOpacity = (opacity: Opacity) => {
		layerEntry.style.visible = true;
		layerEntry.style.opacity = opacity;
	};
</script>

<div class="flex w-full justify-between rounded-lg bg-black p-2">
	<button class="flex aspect-square w-[19%] flex-col items-center gap-1" onclick={hideLayer}>
		<div
			class="hover:bg-accent grid aspect-square w-full cursor-pointer place-items-center rounded-lg object-cover text-left {!layerEntry
				.style.visible
				? 'bg-accent'
				: ''}"
		>
			<Icon icon={getVisibilityIconName(false)} class="h-8 w-8 text-base/90" />
		</div>

		<span
			class="rounded-lg p-1 px-2 text-base text-sm transition-colors duration-150 select-none {!layerEntry
				.style.visible
				? 'bg-accent text-black'
				: 'border-base'}">隠す</span
		>
	</button>

	{#each opacityButtons as item (item.label)}
		<button
			class="flex aspect-square w-[19%] flex-col items-center gap-1 select-none"
			onclick={() => applyOpacity(item.value)}
		>
			{#if previewSrc}
				<div
					class="relative h-full w-full overflow-hidden rounded-lg border-2 {layerEntry.style
						.opacity === item.value && layerEntry.style.visible
						? 'border-accent'
						: 'border-transparent'}"
				>
					<!-- {#if layerEntry.metaData.xyzImageTile && layerEntry.type === 'vector'}
						<img
							src={getBaseMapImageUrl(layerEntry.metaData.xyzImageTile)}
							class="c-basemap-img absolute top-0 left-0 h-full w-full scale-200 cursor-pointer object-cover text-left text-sm"
							alt="背景地図画像"
						/>
					{/if} -->
					<img
						src={previewSrc}
						alt={layerEntry.metaData.name}
						class="c-no-drag-icon absolute top-0 left-0 h-full w-full scale-200 cursor-pointer text-left text-sm"
						style="opacity: {item.value};"
					/>
				</div>
			{/if}
			<span
				class="rounded-lg p-1 px-2 text-base text-sm transition-colors duration-150 select-none {layerEntry
					.style.opacity === item.value && layerEntry.style.visible
					? 'bg-accent text-black'
					: 'border-base'}">{item.label}</span
			>
		</button>
	{/each}
</div>

<style>
</style>
