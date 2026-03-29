<script lang="ts">
	import Icon from '@iconify/svelte';
	import chroma from 'chroma-js';
	import type { StyleImage } from 'maplibre-gl';
	import { fly } from 'svelte/transition';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import type { SpritePatternId } from '$routes/map/data/types/vector/pattern';
	import type { VectorLayerType } from '$routes/map/data/types/vector/style';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		label?: string | null;
		pattern: SpritePatternId | null;
		layerType?: VectorLayerType;
	}
	let { label, pattern = $bindable(), layerType }: Props = $props();

	const POINT_SHAPES = [
		'asterisk',
		'circle',
		'hexagon',
		'octagon',
		'oval-h',
		'oval-v',
		'parallelogram',
		'pentagon',
		'rectangle-h',
		'rectangle-v',
		'rhombus',
		'semicircle-bottom',
		'semicircle-top',
		'square',
		'squiggle',
		'star',
		'starburst',
		'trapezoid',
		'triangle-down',
		'triangle-up'
	] as const;

	const POINT_COLORS = [
		'blue',
		'brown',
		'green',
		'grey',
		'orange',
		'pink',
		'purple',
		'red',
		'slime',
		'teal'
	] as const;

	/**
	 * スプライト画像データからdata URL PNGを生成する（単体アイコン用）
	 */
	const createIconImage = (imageData: StyleImage): string | null => {
		try {
			const { width, height, data } = imageData.data;
			console.log(
				'Creating icon image with width:',
				width,
				'height:',
				height,
				'data length:',
				data?.length
			);
			if (!width || !height || !data) return null;
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return null;
			const arr = new Uint8ClampedArray(width * height * 4);
			for (let i = 0; i < arr.length; i++) arr[i] = data[i] || 0;
			ctx.putImageData(new ImageData(arr, width, height), 0, 0);
			return canvas.toDataURL('image/png');
		} catch {
			return null;
		}
	};

	let imageSrc = $derived.by(() => {
		if (!pattern) return null;
		const image = mapStore.getImage(pattern);
		if (!image) return null;
		return createIconImage(image);
	});

	let showColorPallet = $state<boolean>(false);
	let containerRef = $state<HTMLElement>();

	let selectedPointColor = $state<(typeof POINT_COLORS)[number]>('red');

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showColorPallet && containerRef && !containerRef.contains(event.target as Node)) {
				showColorPallet = false;
			}
		};

		if (showColorPallet) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div bind:this={containerRef} class="relative">
	<label
		class="group flex cursor-pointer items-center justify-between pr-2 transition-colors duration-100"
	>
		{#if label}
			<span class="group-hover:text-accent text-base select-none">{label}</span>
		{/if}
		<div class="relative grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-full">
			{#if imageSrc}
				<img src={imageSrc} alt="pattern" class="absolute h-full" />
			{/if}
			<!-- <input type="color" class="invisible" bind:value /> -->
			<input type="checkbox" class="invisible" bind:checked={showColorPallet} />
		</div>
	</label>

	{#if showColorPallet}
		<!-- ポイントアイコン選択UI -->
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="bg-sub absolute z-20 mt-2 w-full rounded-lg p-3 shadow-lg"
		>
			<!-- NOTE:patternが存在するかどうか -->
			{#if pattern && layerType === 'circle'}
				<HorizontalSelectBox
					bind:group={selectedPointColor}
					options={POINT_COLORS.map((c) => ({ key: c, name: c }))}
				/>
				<div class="flex w-full items-center pb-2 text-base"></div>
				<div class="grid grid-cols-10 gap-2 pb-2">
					{#each POINT_SHAPES as shape}
						{@const _pattern = `tmpoint-${shape}-${selectedPointColor}` as SpritePatternId}
						{@const img = mapStore.getImage(_pattern)}
						<button
							class="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-full {pattern ===
							_pattern
								? 'ring-accent ring-2'
								: ''}"
							onclick={() => {
								pattern = _pattern;
								showColorPallet = false;
							}}
						>
							{#if img}
								<img src={createIconImage(img)} alt={_pattern} class="h-5 w-5" />
							{/if}
						</button>
					{/each}
				</div>
				<div class="flex w-full items-center justify-end pb-2">
					<button
						class="relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white px-3 py-2"
						onclick={() => {
							pattern = null;
							showColorPallet = false;
						}}
						aria-label="Remove pattern"><span class="text-sm text-black">アイコンなし</span></button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
</style>
