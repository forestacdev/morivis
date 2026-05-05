<script lang="ts">
	import FeaturePanelHeader from '$routes/map/components/feature_menu/FeaturePanelHeader.svelte';
	import FeaturePanelAttributes from '$routes/map/components/feature_menu/FeaturePanelAttributes.svelte';
	import FeaturePanelTabs from '$routes/map/components/feature_menu/FeaturePanelTabs.svelte';
	import FeaturePanelSummaryBody from '$routes/map/components/feature_menu/FeaturePanelSummaryBody.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { filterByPopupKeys } from '$routes/map/data/types/vector/properties';
	import type {
		FeatureMenuData,
		FeaturePanelSummary as FeaturePanelSummaryData
	} from '$routes/map/types';
	import { getPopupImageFieldKey } from '$routes/map/utils/icon';

	interface Props {
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		showSelectionMarker: boolean;
		summary: FeaturePanelSummaryData | null;
		showSummaryTab: boolean;
		hasAttributeTab: boolean;
		resetKey: string;
	}

	let {
		featureMenuData = $bindable(),
		layerEntries,
		showSelectionMarker = $bindable(),
		summary,
		showSummaryTab,
		hasAttributeTab,
		resetKey
	}: Props = $props();

	let targetLayer = $derived.by(() => {
		if (featureMenuData) {
			const layer = layerEntries.find(
				(entry) => featureMenuData && entry.id === featureMenuData.layerId
			);
			return layer;
		}
		return null;
	});

	let fields = $derived.by(() => {
		if (targetLayer && targetLayer.type === 'vector') {
			return targetLayer.properties.fields;
		}
		return [];
	});

	// let propDict = $derived.by(() => {
	// 	const dict: Record<string, string | number | null> = {};
	// 	layerEntries.forEach((entry) => {
	// 		if (entry.type === 'vector' && entry.properties && entry.properties.dict) {
	// 			Object.assign(dict, entry.properties.dict);
	// 		}
	// 	});
	// 	return dict;
	// });

	let propId = $derived.by(() => {
		if (featureMenuData && featureMenuData.properties) {
			return featureMenuData.properties._prop_id;
		} else {
			return null;
		}
	});

	let imageKey = $derived.by(() => {
		if (targetLayer && targetLayer.type === 'vector') {
			return getPopupImageFieldKey(targetLayer.properties);
		}
		return null;
	});

	let attributeItems = $derived.by(() => {
		if (!targetLayer || targetLayer.type !== 'vector' || !featureMenuData?.properties) {
			return [];
		}

		const popupKeys = targetLayer.properties.attributeView.popupKeys;
		const displayProps =
			popupKeys.length > 0
				? filterByPopupKeys(featureMenuData.properties, popupKeys)
				: featureMenuData.properties;

		return Object.entries(displayProps).filter(
			(entry): entry is [string, string | number | true] => {
				const [key, value] = entry;
				return (
					key !== '_prop_id' &&
					value !== '' &&
					value !== null &&
					value !== undefined &&
					value !== false &&
					imageKey !== key
				);
			}
		);
	});

	$effect(() => {
		if (!featureMenuData) {
			showSelectionMarker = false;
		}
	});
</script>

{#if featureMenuData && summary}
	<FeaturePanelHeader {summary} />

	{#if showSummaryTab && hasAttributeTab}
		<FeaturePanelTabs {summary} {attributeItems} {fields} resetKey={resetKey} />
	{:else if showSummaryTab}
		<FeaturePanelSummaryBody {summary} />
	{:else if !propId}
		<FeaturePanelAttributes {summary} {attributeItems} {fields} />
	{/if}
{/if}
