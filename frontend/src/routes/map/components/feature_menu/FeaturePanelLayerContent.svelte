<script lang="ts">
	import { fade } from 'svelte/transition';

	import FeaturePanelAttributeItem from '$routes/map/components/feature_menu/FeaturePanelAttributeItem.svelte';
	import FeaturePanelSummary from '$routes/map/components/feature_menu/FeaturePanelSummary.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { filterByPopupKeys } from '$routes/map/data/types/vector/properties';
	import type {
		FeatureMenuData,
		FeaturePanelSummary as FeaturePanelSummaryData
	} from '$routes/map/types';

	interface Props {
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		showSelectionMarker: boolean;
		summary: FeaturePanelSummaryData | null;
	}

	let {
		featureMenuData = $bindable(),
		layerEntries,
		showSelectionMarker = $bindable(),
		summary
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
			return targetLayer.properties.attributeView.imageKey;
		}
		return null;
	});

	$effect(() => {
		if (!featureMenuData) {
			showSelectionMarker = false;
		}
	});
</script>

{#if featureMenuData && summary}
	<FeaturePanelSummary {summary} />

	<div in:fade={{ duration: 100 }} class="lg:pl-2">
		<!-- 通常の地物の属性情報 -->
		{#if !propId}
			<div class="w-hull bg-sub mt-4 mb-8 h-[1px] rounded-full opacity-60"></div>
			<div class="mb-56 flex h-full w-full flex-col gap-3">
				{#if targetLayer && targetLayer.type === 'vector' && featureMenuData.properties}
					{@const popupKeys = targetLayer.properties.attributeView.popupKeys}
					{@const displayProps =
						popupKeys.length > 0
							? filterByPopupKeys(featureMenuData.properties, popupKeys)
							: featureMenuData.properties}
					{#each Object.entries(displayProps) as [key, value]}
						{#if key !== '_prop_id' && value && imageKey !== key}
							{@const field = fields.find((f) => f.key === key)}
							<!-- 辞書による属性名書き換え -->
							<FeaturePanelAttributeItem {key} {value} {field} />
						{/if}
					{/each}
				{/if}
			</div>
		{/if}
	</div>
{/if}
