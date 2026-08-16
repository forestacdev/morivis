<script lang="ts">
	import PoiMarker from '$routes/map/components/marker/PoiMarker.svelte';
	import SearchMarker from '$routes/map/components/marker/SearchMarker.svelte';
	import type { HighlightMarkerState } from '$routes/map/types';
	import maplibregl from '$routes/map/utils/maplibre';

	interface Props {
		map: maplibregl.Map;
		highlightMarkerState: HighlightMarkerState | null;
	}

	let { map, highlightMarkerState }: Props = $props();

	let selectedPoiMarkerData = $derived.by(() => {
		if (!highlightMarkerState || highlightMarkerState.type !== 'poi') {
			return null;
		}

		const iconImage = highlightMarkerState.iconImage ?? highlightMarkerState.properties?.iconImage;

		return {
			featureId: highlightMarkerState.featureId,
			lngLat: new maplibregl.LngLat(highlightMarkerState.point[0], highlightMarkerState.point[1]),
			properties: {
				...highlightMarkerState.properties,
				iconImage
			}
		};
	});

	let selectedSearchMarkerData = $derived.by(() => {
		if (!highlightMarkerState || highlightMarkerState.type !== 'search') {
			return null;
		}

		return highlightMarkerState.result;
	});
</script>

{#if selectedPoiMarkerData}
	{#key selectedPoiMarkerData.featureId}
		<PoiMarker
			{map}
			lngLat={selectedPoiMarkerData.lngLat}
			properties={selectedPoiMarkerData.properties}
			featureId={selectedPoiMarkerData.featureId}
			onClick={() => {}}
			clickId={selectedPoiMarkerData.featureId}
		/>
	{/key}
{:else if selectedSearchMarkerData}
	<SearchMarker {map} prop={selectedSearchMarkerData} />
{/if}
