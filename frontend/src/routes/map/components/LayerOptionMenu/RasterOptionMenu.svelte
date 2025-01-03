<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import CheckBox from '$map/components/atoms/CheckBox.svelte';
	import RangeSlider from '$map/components/atoms/RangeSlider.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import type { GeometryType } from '$map/data/types/vector';
	import { generateNumberAndColorMap, generateNumberMap } from '$map/utils/colorMapping';
	import {
		mutableColorMapType,
		type VectorLayerType,
		type ColorsExpressions,
		type LabelsExpressions
	} from '$routes/map/data/types/vector/style';

	let { layerToEdit = $bindable() }: { layerToEdit: GeoDataEntry } = $props();

	onMount(() => {});
</script>

{#if layerToEdit && layerToEdit.type === 'raster'}
	<RangeSlider label="不透明度" bind:value={layerToEdit.style.opacity} />
	<!-- レイヤータイプの選択 -->
	<RangeSlider
		label={'明るさ-最小輝度'}
		bind:value={layerToEdit.style.brightnessMin}
		min={0}
		max={1}
		step={0.01}
	/>
	<RangeSlider
		label={'明るさ-最大輝度'}
		bind:value={layerToEdit.style.brightnessMax}
		min={0}
		max={1}
		step={0.01}
	/>
	<RangeSlider
		label={'コントラスト'}
		bind:value={layerToEdit.style.contrast}
		min={-1}
		max={1}
		step={0.01}
	/>
	<RangeSlider
		label={'色相'}
		bind:value={layerToEdit.style.hueRotate}
		min={-360}
		max={360}
		step={0.1}
	/>
	<RangeSlider
		label={'彩度'}
		bind:value={layerToEdit.style.saturation}
		min={-1}
		max={1}
		step={0.01}
	/>
{/if}

<style>
</style>
