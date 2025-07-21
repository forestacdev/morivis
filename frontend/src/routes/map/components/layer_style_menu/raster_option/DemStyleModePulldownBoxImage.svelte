<script lang="ts">
	import type { RasterDemEntry } from '$routes/map/data/types/raster';
	import { type ImageResult, getLayerImage } from '$routes/map/utils/image';

	interface Props {
		isMode: string;
		mode: string;
		name: string;
		showPullDown: boolean;
		layerEntry: RasterDemEntry;
	}

	let {
		isMode = $bindable(),
		mode,
		name,
		showPullDown = $bindable(),
		layerEntry
	}: Props = $props();

	let promise = $state<Promise<ImageResult | undefined>>();
	let isImageError = $state<boolean>(false);

	let copyEntry = $derived.by(() => {
		return {
			...layerEntry,
			style: { ...layerEntry.style, visualization: { ...layerEntry.style.visualization, mode } }
		};
	});

	$effect(() => {
		try {
			promise = getLayerImage(copyEntry);
		} catch (error) {
			isImageError = true;
			console.error('Error generating icon image:', error);
			promise = Promise.resolve(undefined);
		}
	});
</script>

<label
	class="group flex w-full cursor-pointer flex-col items-center justify-between gap-2 p-2 text-white transition-colors duration-100 {isMode ===
	mode
		? ''
		: ''}"
>
	<input
		type="radio"
		bind:group={isMode}
		value={mode}
		class="hidden"
		onchange={() => (showPullDown = false)}
	/>

	<div
		class="border-3 overflow-hidden rounded-md {isMode === mode
			? 'border-accent'
			: 'border-transparent'}"
	>
		{#await promise then imageResult}
			{#if imageResult}
				<img alt={name} src={imageResult.url} class="aspect-square w-full bg-black object-cover" />
			{/if}
		{:catch}
			<div>画像の取得に失敗</div>
		{/await}
	</div>
	<span class="select-none text-sm">{name}</span>
</label>
