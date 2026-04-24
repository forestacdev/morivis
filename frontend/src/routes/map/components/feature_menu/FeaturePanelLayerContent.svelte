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
		selectedTab: 'summary' | 'attributes';
	}

	let {
		featureMenuData = $bindable(),
		layerEntries,
		showSelectionMarker = $bindable(),
		summary,
		selectedTab
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
	{#if selectedTab === 'summary'}
		<FeaturePanelSummary {summary} />
	{/if}

	{#if !propId && selectedTab === 'attributes'}
		<div in:fade={{ duration: 100 }} class="lg:pl-2">
			<div class="pb-6">
				<div class="flex w-full flex-col gap-1 text-base max-lg:hidden">
					<span class="text-[22px] font-bold break-all">{summary.title}</span>
					{#if summary.subtitle}
						<span class="text-[14px] break-all text-gray-300">{summary.subtitle}</span>
					{/if}
				</div>
			</div>
			<div class="mb-56 flex h-full w-full flex-col gap-3">
				{#each attributeItems as [key, value] (key)}
					{@const field = fields.find((f) => f.key === key)}
					<FeaturePanelAttributeItem {key} {value} {field} />
				{/each}
			</div>
		</div>
	{/if}
{/if}
