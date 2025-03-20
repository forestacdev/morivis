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

	import type { Legend } from '$routes/data/types/raster';
	let {
		data = $bindable(),
		legend = $bindable()
	}: {
		data: {
			color: string;
			label: string;
		};
		legend: Legend;
	} = $props();
</script>

<div>
	<div>{legend.name}</div>
	<div class="flex items-center gap-2">
		<div class="h-4 w-4 rounded-full" style="background-color: {data.color}"></div>
		<span>{data.label}</span>
	</div>
</div>

<style>
</style>
