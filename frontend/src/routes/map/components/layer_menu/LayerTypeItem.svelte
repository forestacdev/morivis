<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fly, slide, scale } from 'svelte/transition';

	import type { GeoDataEntry } from '$routes/map/data/types';

	import { getLayerIcon, TYPE_LABELS, type LayerType } from '$routes/map/utils/entries';

	import LayerItem from '$routes/map/components/layer_menu/LayerItem.svelte';

	import { flip } from 'svelte/animate';
	import { isStyleEdit } from '$routes/stores';
	import { showDataMenu } from '$routes/stores/ui';

	interface Props {
		layerType: LayerType;
		typeEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null; // データメニューの表示状態
		tempLayerEntries: GeoDataEntry[];
		enableFlip: boolean;
		isDraggingLayerType: LayerType | null; // ドラッグ中のレイヤータイプ
	}

	let {
		layerType,
		typeEntries,
		showDataEntry = $bindable(), // データメニューの表示状態
		tempLayerEntries = $bindable(),
		enableFlip = $bindable(),
		isDraggingLayerType = $bindable() // ドラッグ中のレイヤータイプ
	}: Props = $props();
</script>

<!-- 左側：レイヤータイプアイコン -->

{#if !$isStyleEdit && !$showDataMenu}
	<div
		transition:fly={{ duration: 200, delay: $showDataMenu ? 0 : 200 }}
		class="sticky top-[0px] z-10 flex w-[50px] shrink-0 translate-y-[8px] justify-center"
	>
		<div class="bg-base peer absolute z-10 aspect-square rounded-full p-1.5">
			<Icon icon={getLayerIcon(layerType)} class="h-5 w-5" />
		</div>
		<div
			class="bg-base pointer-events-none absolute top-10 z-10 w-[60px] rounded-full px-1 text-center text-xs opacity-0 transition-opacity duration-200 peer-hover:opacity-100"
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
			{layerType}
			{layerEntry}
			bind:showDataEntry
			bind:tempLayerEntries
			bind:enableFlip
			bind:isDraggingLayerType
		/>
	</div>
{/each}

<style>
</style>
