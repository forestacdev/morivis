<script lang="ts">
	import Accordion from '../../atoms/Accordion.svelte';
	import RangeSlider from '../../atoms/RangeSlider.svelte';

	import type { MorivisRasterEntry, RasterTiffStyle } from '$routes/map/data/types/raster';

	let { layerEntry = $bindable() }: { layerEntry: MorivisRasterEntry<RasterTiffStyle> } = $props();
	let expanded = $state(true);
	const maximum = $derived(layerEntry.properties?.bands?.sampleRanges?.[0]?.max ?? 1);
</script>

{#if layerEntry.style.volume}
	<section aria-label="ボクセル設定">
		<Accordion label="ボクセル" bind:value={expanded}>
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
			<p class="text-sm text-gray-300">
				1倍で実際の高度を表示します。値0と欠損は表示しません。縮小表示と周辺の地域には粗い格子を使用します。
			</p>
		</Accordion>
	</section>
{/if}
