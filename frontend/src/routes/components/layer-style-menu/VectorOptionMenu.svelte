<script lang="ts">
	import LabelLayerOption from './vecter-option/LabelLayerOption.svelte';
	import LineStringOption from './vecter-option/LineStringOption.svelte';
	import PointOption from './vecter-option/PointOption.svelte';
	import PolygonOption from './vecter-option/PolygonOption.svelte';

	import type {
		VectorEntry,
		PolygonEntry,
		LineStringEntry,
		PointEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/data/types/vector';

	let { layerEntry = $bindable() }: { layerEntry: VectorEntry<GeoJsonMetaData | TileMetaData> } =
		$props();
</script>

{#if layerEntry && layerEntry.type === 'vector'}
	{#if layerEntry.format.geometryType === 'Point'}
		<PointOption bind:layerEntry={layerEntry as PointEntry<GeoJsonMetaData | TileMetaData>} />
	{/if}

	{#if layerEntry.format.geometryType === 'LineString'}
		<LineStringOption
			bind:layerEntry={layerEntry as LineStringEntry<GeoJsonMetaData | TileMetaData>}
		/>
	{/if}

	{#if layerEntry.format.geometryType === 'Polygon'}
		<PolygonOption bind:layerEntry={layerEntry as PolygonEntry<GeoJsonMetaData | TileMetaData>} />
	{/if}

	{#if layerEntry.format.geometryType === 'Label'}
		<LabelLayerOption bind:layerEntry />
	{/if}
{/if}

<style>
</style>
