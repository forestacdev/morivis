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
		<LabelLayerOption bind:layerToEdit />
	{/if}
{/if}

<style>
</style>
