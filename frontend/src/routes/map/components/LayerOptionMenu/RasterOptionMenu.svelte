<script lang="ts">
	import Icon from '@iconify/svelte';
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

	let {
		layerToEdit = $bindable()
	}: { layerToEdit: GeoDataEntry | undefined; tempLayerEntries: GeoDataEntry[] } = $props();

	onMount(() => {});
</script>

{#if layerToEdit}
	<!-- レイヤータイプの選択 -->
{/if}

<style>
</style>
