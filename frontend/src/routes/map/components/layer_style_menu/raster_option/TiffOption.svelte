<script lang="ts">
	import ColorScaleDem from '../extension_menu/ColorScaleDem.svelte';

	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import StyleColorMapPulldownBox from '$routes/map/components/layer_style_menu/extension_menu/StyleColorMapPulldownBox.svelte';
	import TiffStyleModePulldownBox from '$routes/map/components/layer_style_menu/raster_option/TiffStyleModePulldownBox.svelte';
	import { COLOR_MAP_TYPE, type RasterTiffStyle } from '$routes/map/data/types/raster';

	interface Props {
		style: RasterTiffStyle;
	}

	let { style = $bindable() }: Props = $props();

	const numBands = $derived(style.visualization.numBands);
	const BAND_CHANNELS = [
		{ key: 'r' as const, label: 'R', color: '#ef4444' },
		{ key: 'g' as const, label: 'G', color: '#22c55e' },
		{ key: 'b' as const, label: 'B', color: '#3b82f6' }
	];
</script>

<TiffStyleModePulldownBox bind:isMode={style.visualization.mode} />

{#if style.visualization.mode === 'single'}
	<StyleColorMapPulldownBox
		bind:isColorMap={style.visualization.uniformsData['single'].colorMap}
		mutableColorMapType={[...COLOR_MAP_TYPE]}
	>
		{#snippet children(_isColorMap)}
			<ColorScaleDem isColorMap={_isColorMap} />
		{/snippet}
	</StyleColorMapPulldownBox>
	<RangeSlider
		label="最大値"
		bind:value={style.visualization.uniformsData['single'].max}
		max={5000}
		min={0}
		step={0.01}
	/>

	<RangeSlider
		label="最小値"
		bind:value={style.visualization.uniformsData['single'].min}
		max={5000}
		min={0}
		step={0.01}
	/>
{:else if style.visualization.mode === 'multi'}
	<h2 class="text-base">バンド割り当て</h2>
	<div class="flex flex-col gap-3 py-2">
		{#each BAND_CHANNELS as { key, label, color }}
			<div class="flex flex-col gap-1">
				<div class="flex items-center gap-2">
					<span
						class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
						style="background-color: {color}"
					>
						{label}
					</span>
					<span class="text-sm">バンド</span>
					<select
						class="c-select w-20 text-sm"
						bind:value={style.visualization.uniformsData.multi[key].index}
					>
						{#each Array.from({ length: numBands }, (_, i) => i) as bandIdx}
							<option value={bandIdx}>{bandIdx + 1}</option>
						{/each}
					</select>
				</div>
				<div class="flex gap-2 pl-8">
					<RangeSlider
						label="Min"
						bind:value={style.visualization.uniformsData.multi[key].min}
						min={0}
						max={style.visualization.uniformsData.multi[key].max}
						step={1}
					/>
					<RangeSlider
						label="Max"
						bind:value={style.visualization.uniformsData.multi[key].max}
						min={style.visualization.uniformsData.multi[key].min}
						max={65535}
						step={1}
					/>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
</style>
