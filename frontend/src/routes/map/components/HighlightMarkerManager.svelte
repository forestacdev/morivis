<script lang="ts">
	import maplibregl from 'maplibre-gl';

	import PoiMarker from '$routes/map/components/marker/PoiMarker.svelte';
	import SearchMarker from '$routes/map/components/marker/SearchMarker.svelte';
	import { ICON_IMAGE_BASE_PATH } from '$routes/constants';
	import type { HighlightMarkerState } from '$routes/map/types';

	interface Props {
		map: maplibregl.Map;
		highlightMarkerState: HighlightMarkerState | null;
	}

	let { map, highlightMarkerState }: Props = $props();

	let selectedPoiMarkerData = $derived.by(() => {
		if (!highlightMarkerState || highlightMarkerState.type !== 'poi') {
			return null;
		}

		const propId = highlightMarkerState.properties?._prop_id;
		if (typeof propId !== 'string') return null;

		return {
			featureId: highlightMarkerState.featureId,
			lngLat: new maplibregl.LngLat(highlightMarkerState.point[0], highlightMarkerState.point[1]),
			properties: {
				...highlightMarkerState.properties,
				iconImage: `${ICON_IMAGE_BASE_PATH}/${propId}.webp`
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
