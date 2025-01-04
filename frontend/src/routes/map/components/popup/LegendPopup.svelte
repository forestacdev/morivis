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
	let {
		legend = $bindable()
	}: {
		legend: {
			color: string;
			label: string;
		};
	} = $props();
</script>

<div>
	<div class="flex items-center gap-2">
		<div class="h-4 w-4 rounded-full" style="background-color: {legend.color}"></div>
		<span>{legend.label}</span>
	</div>
</div>

<style>
</style>
