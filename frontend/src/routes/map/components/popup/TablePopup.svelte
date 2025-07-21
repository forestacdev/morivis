<script lang="ts">
	import type {
		Map,
		StyleSpecification,
		MapGeoJSONFeature,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker,
		CircleLayerSpecification
	} from 'maplibre-gl';
	let { feature = $bindable() }: { feature: MapGeoJSONFeature } = $props();
</script>

<div>
	<table class="table-auto">
		<tbody>
			{#each Object.entries(feature.properties) as [key, value]}
				<tr>
					<td class="border px-4 py-2">{key}</td>
					<td class="border px-4 py-2">{value}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
</style>
