<script lang="ts">
	import Icon from '@iconify/svelte';
	import { flip } from 'svelte/animate';
	import { fly, slide, scale } from 'svelte/transition';

	import LayerItem from '$routes/map/components/layer_menu/LayerItem.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { getLayerIcon, TYPE_LABELS, type LayerType } from '$routes/map/utils/entries';
	import { isStyleEdit } from '$routes/stores';
	import { showDataMenu } from '$routes/stores/ui';

	interface Props {
		layerType: LayerType;
		lastLayerType: LayerType | null;
		typeEntries: GeoDataEntry[];
		layerInRangeMap: Record<string, boolean>;
		showDataEntry: GeoDataEntry | null; // データメニューの表示状態
		tempLayerEntries: GeoDataEntry[];
		enableFlip: boolean;
		isDraggingLayerType: LayerType | null; // ドラッグ中のレイヤータイプ
		isHoveredLayerType: LayerType | null; // ホバー中のレイヤータイプ
		featureMenuData: FeatureMenuData | null;
		isTouchDragging: boolean; // タッチデバイスでのドラッグ中かどうか
		isRecommendedDataDragging: boolean;
	}

	let {
		layerType,
		lastLayerType,
		typeEntries,
		layerInRangeMap,
		showDataEntry = $bindable(), // データメニューの表示状態
		tempLayerEntries = $bindable(),
		enableFlip = $bindable(),
		isDraggingLayerType = $bindable(), // ドラッグ中のレイヤータイプ
		isHoveredLayerType = $bindable(), // ホバー中のレイヤータイプ
		featureMenuData = $bindable(),
		isTouchDragging = $bindable(), // タッチデバイスでのドラッグ中かどうか
		isRecommendedDataDragging
	}: Props = $props();
	let isLastType = $derived(lastLayerType === layerType);
</script>

<!-- 左側：レイヤータイプアイコン -->
{#if !$isStyleEdit && !$showDataMenu}
	<div
		transition:fly={{ duration: 200, delay: $showDataMenu ? 0 : 200 }}
		class="sticky top-[0px] z-10 flex w-[50px] shrink-0 translate-y-[25px] justify-center"
	>
		<div
			class=" peer absolute z-10 aspect-square rounded-full p-1.5 {isHoveredLayerType === layerType
				? 'bg-accent text-base'
				: 'bg-base text-main'} duration-200"
		>
			<Icon icon={getLayerIcon(layerType)} class="h-5 w-5" />
		</div>
		<div
			class="bg-base text-main pointer-events-none absolute top-10 z-10 w-[60px] rounded-full px-1 text-center text-xs opacity-0 transition-opacity duration-200 peer-hover:opacity-100"
		>
			{TYPE_LABELS[layerType]}
		</div>
	</div>
{/if}

<!-- 右側：レイヤーアイテム -->
{#each typeEntries as layerEntry, i (layerEntry.id)}
	<div animate:flip={{ duration: enableFlip ? 200 : 0 }}>
		<LayerItem
			index={i}
			length={typeEntries.length}
			isLast={isLastType && i === typeEntries.length - 1}
			{layerType}
			{layerEntry}
			isLayerInRange={layerInRangeMap[layerEntry.id] ?? false}
			bind:showDataEntry
			bind:tempLayerEntries
			bind:enableFlip
			bind:isDraggingLayerType
			bind:isHoveredLayerType
			bind:featureMenuData
			bind:isTouchDragging
			{isRecommendedDataDragging}
		/>
	</div>
{/each}

<style>
</style>
