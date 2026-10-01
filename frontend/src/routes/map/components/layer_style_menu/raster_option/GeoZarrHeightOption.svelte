<script lang="ts" generics="T">
	import Accordion from '../../atoms/Accordion.svelte';
	import RangeSlider from '../../atoms/RangeSlider.svelte';
	import Switch from '../../atoms/Switch.svelte';

	import type { MorivisRasterEntry } from '$routes/map/data/types/raster';

	let { layerEntry = $bindable() }: { layerEntry: MorivisRasterEntry<T> } = $props();
	let expanded = $state(true);
	const axis = $derived(layerEntry.properties?.vertical);
	const selection = $derived(layerEntry.state?.vertical);
	const height = $derived(selection?.height ?? axis?.min ?? 0);
	const setSelection = (mode: 'max' | 'height', value = height) => {
		layerEntry.state = { ...layerEntry.state, vertical: { mode, height: value } };
	};
</script>

{#if axis}
	<section aria-label="Zarrの高度設定">
		<Accordion label="高度" bind:value={expanded}>
			<Switch
				label="指定高度の断面"
				bind:value={
					() => selection?.mode === 'height', (enabled) => setSelection(enabled ? 'height' : 'max')
				}
			/>
			{#if selection?.mode === 'height'}
				<p class="mb-3 text-sm">
					高度 {height.toLocaleString()}〜{Math.min(height + axis.step, axis.max).toLocaleString()} m
				</p>
				<RangeSlider
					label="高度（m）"
					min={axis.min}
					max={axis.max - axis.step}
					step={axis.step}
					bind:value={() => height, (value) => setSelection('height', value)}
					showValue={false}
				/>
				{#if layerEntry.format.type === 'geozarr' && layerEntry.format.arrayPath
						?.split('/')
						.pop() === 'detail'}
					<p class="mb-3 text-sm">縮小表示では、選択した高度を含む粗い格子を表示します。</p>
				{/if}
			{:else}
				<p class="mb-3 text-sm">高度方向の最大値を表示しています。</p>
			{/if}
		</Accordion>
	</section>
{/if}
