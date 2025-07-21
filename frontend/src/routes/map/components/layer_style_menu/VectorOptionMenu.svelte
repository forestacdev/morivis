<script lang="ts">
	import LineStringOption from './vecter_option/LineStringOption.svelte';
	import PointOption from './vecter_option/PointOption.svelte';
	import PolygonOption from './vecter_option/PolygonOption.svelte';

	import type {
		VectorEntry,
		PolygonEntry,
		LineStringEntry,
		PointEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/map/data/types/vector';
	import { style } from '$routes/_development/maptreestyle/style';
	import RangeSlider from '../atoms/RangeSlider.svelte';

	interface Props {
		layerEntry: VectorEntry<GeoJsonMetaData | TileMetaData>;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();
</script>

{#if layerEntry && layerEntry.type === 'vector'}
	{#if layerEntry.format.geometryType === 'Point'}
		<PointOption
			bind:layerEntry={layerEntry as PointEntry<GeoJsonMetaData | TileMetaData>}
			bind:showColorOption
		/>
	{/if}

	{#if layerEntry.format.geometryType === 'LineString'}
		<LineStringOption
			bind:layerEntry={layerEntry as LineStringEntry<GeoJsonMetaData | TileMetaData>}
			bind:showColorOption
		/>
	{/if}

	{#if layerEntry.format.geometryType === 'Polygon'}
		<PolygonOption
			bind:layerEntry={layerEntry as PolygonEntry<GeoJsonMetaData | TileMetaData>}
			bind:showColorOption
		/>
	{/if}
{/if}

<style>
</style>
