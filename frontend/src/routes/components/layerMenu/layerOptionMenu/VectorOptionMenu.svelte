<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';

	import ColorOption from './ColorOption.svelte';
	import LabelOption from './vecterOption/LabelOption.svelte';
	import LineStringOption from './vecterOption/LineStringOption.svelte';
	import PointOption from './vecterOption/PointOption.svelte';
	import PolygonOption from './vecterOption/PolygonOption.svelte';

	import Accordion from '$routes/components/atoms/Accordion.svelte';
	import CheckBox from '$routes/components/atoms/CheckBox.svelte';
	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import HorizontalSelectBox from '$routes/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import type {
		GeometryType,
		VectorEntry,
		PolygonEntry,
		LineStringEntry,
		LabelEntry,
		PointEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/data/types/vector';
	import {
		type VectorLayerType,
		type ColorsExpressions,
		type LabelsExpressions
	} from '$routes/data/types/vector/style';
	import { selectedLayerId } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import {
		generateNumberAndColorMap,
		generateNumberMap,
		generateColorPalette
	} from '$routes/utils/colorMapping';

	let { layerToEdit = $bindable() }: { layerToEdit: VectorEntry<GeoJsonMetaData | TileMetaData> } =
		$props();
</script>

{#if layerToEdit && layerToEdit.type === 'vector'}
	{#if layerToEdit.format.geometryType === 'Point'}
		<PointOption bind:layerToEdit={layerToEdit as PointEntry<GeoJsonMetaData | TileMetaData>} />
	{/if}

	{#if layerToEdit.format.geometryType === 'LineString'}
		<LineStringOption
			bind:layerToEdit={layerToEdit as LineStringEntry<GeoJsonMetaData | TileMetaData>}
		/>
	{/if}

	{#if layerToEdit.format.geometryType === 'Polygon'}
		<PolygonOption bind:layerToEdit={layerToEdit as PolygonEntry<GeoJsonMetaData | TileMetaData>} />
	{/if}

	{#if layerToEdit.format.geometryType === 'Label'}
		<LabelOption bind:layerToEdit />
	{/if}
{/if}

<style>
</style>
