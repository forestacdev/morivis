<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import type { GaussianSplatEntry } from '$routes/map/data/types/model';
	import { mapStore } from '$routes/stores/map';
	import { showModelView } from '$routes/stores/ui';

	interface Props {
		layerEntry: GaussianSplatEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	const applyStyle = () => {
		mapStore.setModelStyle({ ...layerEntry, style: { ...layerEntry.style } });
	};

	$effect(() => {
		applyStyle();
	});
</script>

{#if $showModelView}
	<Accordion label="スプラット表示" icon="mdi:blur" bind:value={showColorOption}>
		<RangeSlider
			label="スプラットサイズ"
			bind:value={layerEntry.style.splatScale}
			min={0.1}
			max={5}
			step={0.05}
			icon="mdi:circle-outline"
			onInput={applyStyle}
		/>
		<p class="pb-2 text-sm text-base/70">
			色・透明度はPLYの3D Gaussian Splatting属性を使用します。
		</p>
	</Accordion>
{/if}
