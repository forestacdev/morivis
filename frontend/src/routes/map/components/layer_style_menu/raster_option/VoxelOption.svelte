<script lang="ts">
	import Accordion from '../../atoms/Accordion.svelte';
	import RangeSlider from '../../atoms/RangeSlider.svelte';

	import type { MorivisRasterEntry, RasterTiffStyle } from '$routes/map/data/types/raster';

	let { layerEntry = $bindable() }: { layerEntry: MorivisRasterEntry<RasterTiffStyle> } = $props();
	let expanded = $state(true);
	const maximum = $derived(layerEntry.properties?.bands?.sampleRanges?.[0]?.max ?? 1);
	const isVolume = $derived(layerEntry.style.volume?.type === 'volume');
	const label = $derived(isVolume ? 'ボリューム' : 'ボクセル');
</script>

{#if layerEntry.style.volume}
	<section aria-label={`${label}設定`}>
		<Accordion {label} bind:value={expanded}>
			<RangeSlider
				label="表示する値の下限"
				min={0}
				max={maximum}
				step={Math.max(0.001, maximum / 1000)}
				bind:value={layerEntry.style.volume.threshold}
			/>
			<RangeSlider
				label="高さ倍率"
				min={1}
				max={20}
				step={1}
				isInt
				bind:value={layerEntry.style.volume.heightScale}
			/>
			{#if isVolume}
				<RangeSlider
					label="濃さ"
					min={0.1}
					max={10}
					step={0.1}
					bind:value={
						() => layerEntry.style.volume?.density ?? 2,
						(value) => {
							if (layerEntry.style.volume) layerEntry.style.volume.density = value;
						}
					}
				/>
			{/if}
			<p class="text-sm text-gray-300">
				1倍で実際の高度を表示します。値0と欠損は表示しません。縮小表示と周辺の地域には粗い格子を使用します。
			</p>
		</Accordion>
	</section>
{/if}
