<script lang="ts">
	import type { DemRangeColorStyle, RasterDemEntry } from '$routes/map/data/types/raster';
	import { type ImageResult, getLayerImage } from '$routes/map/utils/image';
	import { isDemStepColorStyle } from '$routes/map/utils/style/color-mapping';

	interface Props {
		isMode: string;
		mode: string;
		name: string;
		hoveredName: string;
		showPullDown: boolean;
		layerEntry: RasterDemEntry;
	}

	let {
		isMode = $bindable(),
		mode,
		name,
		hoveredName = $bindable(),
		showPullDown = $bindable(),
		layerEntry
	}: Props = $props();

	let promise = $state<Promise<ImageResult | undefined>>();
	let isImageError = $state<boolean>(false);

	let copyEntry: RasterDemEntry = $derived.by(() => {
		return {
			...layerEntry,
			style: { ...layerEntry.style, visualization: { ...layerEntry.style.visualization, mode } }
		} as RasterDemEntry;
	});

	const normalizePreviewRangeStyle = (style: DemRangeColorStyle): DemRangeColorStyle => {
		return isDemStepColorStyle(style)
			? {
					...style,
					min: 0,
					max: 0
				}
			: {
					...style,
					min: 0,
					max: 0
				};
	};

	const previewKey = $derived.by(() =>
		JSON.stringify({
			id: copyEntry.id,
			mode: copyEntry.style.visualization.mode,
			uniformsData: {
				...copyEntry.style.visualization.uniformsData,
				relief: normalizePreviewRangeStyle(copyEntry.style.visualization.uniformsData.relief),
				slope: copyEntry.style.visualization.uniformsData.slope
					? normalizePreviewRangeStyle(copyEntry.style.visualization.uniformsData.slope)
					: undefined
			}
		})
	);

	$effect(() => {
		try {
			void previewKey;
			promise = getLayerImage(copyEntry);
		} catch (error) {
			isImageError = true;
			console.error('Error generating icon image:', error);
			promise = Promise.resolve(undefined);
		}
	});
</script>

<label
	class="group flex w-full cursor-pointer flex-col items-center justify-between text-white transition-colors duration-100 {isMode ===
	mode
		? ''
		: ''}"
	onmouseenter={() => (hoveredName = name)}
>
	<input
		type="radio"
		bind:group={isMode}
		value={mode}
		class="hidden"
		onchange={() => (showPullDown = false)}
		onclick={() => (showPullDown = false)}
	/>
	<div
		class="lg:hover:border-base overflow-hidden rounded-full border-3 {isMode === mode
			? 'border-accent'
			: 'border-transparent'}"
	>
		{#await promise then imageResult}
			{#if imageResult}
				<img
					alt={name}
					src={imageResult.url}
					class="c-no-drag-icon aspect-square w-full bg-black object-cover"
				/>
			{/if}
		{:catch}
			<div>画像の取得に失敗</div>
		{/await}
	</div>
</label>
