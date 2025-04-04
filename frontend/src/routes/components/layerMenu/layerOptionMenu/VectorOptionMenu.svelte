<script lang="ts">
	import LabelLayerOption from './vecterOption/LabelLayerOption.svelte';
	import LineStringOption from './vecterOption/LineStringOption.svelte';
	import PointOption from './vecterOption/PointOption.svelte';
	import PolygonOption from './vecterOption/PolygonOption.svelte';

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
