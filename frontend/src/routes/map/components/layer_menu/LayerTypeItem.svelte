<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fly, slide } from 'svelte/transition';

	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import { activeLayerIdsStore, reorderStatus } from '$routes/stores/layers';
	import { mapStore, type MapState } from '$routes/stores/map';
	import { isBBoxOverlapping } from '$routes/map/utils/map';
	import { onMount } from 'svelte';
	import { layerAttributions } from '$routes/stores/attributions';
	import { getLayerIcon, TYPE_LABELS, type LayerType } from '$routes/map/utils/entries';
	import { isActiveMobileMenu, showDataMenu } from '$routes/stores/ui';
	import { getAttributionName } from '$routes/map/data/attribution';
	import { checkMobile, checkPc } from '$routes/map/utils/ui';
	import LayerItem from '$routes/map/components/layer_menu/LayerItem.svelte';
	import LayerSlot from './_LayerSlot.svelte';

	import { flip } from 'svelte/animate';

	interface Props {
		length: number;
		layerType: LayerType;
		layerEntry: GeoDataEntry;
		typeEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null; // データメニューの表示状態
		tempLayerEntries: GeoDataEntry[];
		enableFlip: boolean;
		isDraggingLayerType: LayerType | null; // ドラッグ中のレイヤータイプ
	}

	let {
		index,
		length,
		layerType,
		layerEntry,
		typeEntries,
		showDataEntry = $bindable(), // データメニューの表示状態
		tempLayerEntries = $bindable(),
		enableFlip = $bindable(),
		isDraggingLayerType = $bindable() // ドラッグ中のレイヤータイプ
	}: Props = $props();
	let showLegend = $state(false);
	let showMobileLegend = $state(false);
	let isDragging = $state(false);
	let draggingEnabled = $state(true);

	let isHovered = $state(false);
	let isCheckBoxHovered = $state(false);
	let isLayerInRange = $state(false);

	let LayerBbox = $derived.by(() => {
		return layerEntry?.metaData.bounds;
	});

	const selectedLayer = () => {
		if (!layerEntry) return;
		selectedLayerId.set(layerEntry.id);

		if (!isLayerInRange && $isStyleEdit) mapStore.focusLayer(layerEntry);
	};

	isStyleEdit.subscribe((value) => {
		if (!layerEntry) return;
		if (value && $selectedLayerId === layerEntry.id && !isLayerInRange) {
			mapStore.focusLayer(layerEntry);
		}
	});

	const toggleChecked = (id: string) => {
		showLegend = !showLegend;
		if (showLegend) {
			selectedLayerId.set(id);
		}
	};

	showDataMenu.subscribe((value) => {
		if (value) {
			$selectedLayerId = '';
		}
	});

	// TODO: レイヤーのコピー
	const copyLayer = () => {
		if (!layerEntry) return;
		$isStyleEdit = false;
		const uuid = crypto.randomUUID();
		const copy: GeoDataEntry = JSON.parse(JSON.stringify(layerEntry)); // 深いコピーを作成

		copy.id = uuid;
		copy.metaData.name = `${layerEntry.metaData.name} (コピー)`;

		tempLayerEntries = [...tempLayerEntries, copy];

		activeLayerIdsStore.add(uuid);
	};

	// レイヤーの削除
	const removeLayer = () => {
		$isStyleEdit = false;
		if (!layerEntry) return;
		activeLayerIdsStore.remove(layerEntry.id);
		selectedLayerId.set('');
	};

	// レイヤーのフォーカス
	const focusLayer = () => {
		if (!layerEntry) return;
		mapStore.focusLayer(layerEntry);
		if (checkMobile()) {
			isActiveMobileMenu.set('map');
		}
	};

	const editLayer = () => {
		if (!layerEntry) return;
		selectedLayerId.set(layerEntry.id);
		$isStyleEdit = !$isStyleEdit;
	};

	// TODO: レイヤーのコピー
	const infoLayer = () => {
		if (!layerEntry) return;
		$isStyleEdit = false;
		const uuid = crypto.randomUUID();
		const copy: GeoDataEntry = JSON.parse(JSON.stringify(layerEntry)); // 深いコピーを作成

		copy.id = uuid;
		copy.metaData.name = `${layerEntry.metaData.name}`;

		showDataEntry = copy; // データメニューを表示
	};

	let dragOffsetX = 0;
	let dragOffsetY = 0;

	const handleMouseDown = (e: MouseEvent, layerId: string) => {
		const target = document.getElementById(layerId);
		if (!target) return;
		const rect = target.getBoundingClientRect();
		dragOffsetX = e.clientX - rect.left;
		dragOffsetY = e.clientY - rect.top;
	};

	const dragStart = (e: DragEvent, layerId: string) => {
		if (!e.dataTransfer) return;
		e.dataTransfer.effectAllowed = 'move';
		const dragElement = document.getElementById(layerId) as HTMLElement;
		e.dataTransfer.setDragImage(dragElement, dragOffsetX, dragOffsetY);

		isDragging = true;
		enableFlip = false;
		showLegend = false;

		isDraggingLayerType = layerType; // ドラッグ中のレイヤータイプを設定
		selectedLayerId.set(layerId);
	};

	// ドラッグ中のレイヤーを取得
	const dragEnter = (layerId: string) => {
		if (layerId && $selectedLayerId !== layerId) {
			activeLayerIdsStore.reorder($selectedLayerId, layerId);
		}
	};

	// ドラッグ終了時にアニメーションを有効にする
	const dragEnd = () => {
		isDragging = false;
		enableFlip = true;
		isDraggingLayerType = null; // ドラッグ中のレイヤータイプをリセット
		reorderStatus.set('idle');
	};

	// レイヤー表示範囲をチェック

	const checkRange = (_state: MapState) => {
		if (!layerEntry) return;
		let z = _state.zoom;

		if ('tileSize' in layerEntry.metaData && layerEntry.metaData.tileSize === 256) {
			z = z + 1.5;
		}

		// ズームレベル範囲内かのチェック
		if (layerEntry.metaData.minZoom && z < layerEntry.metaData.minZoom) {
			isLayerInRange = false;
			return;
		}

		if (!LayerBbox) {
			isLayerInRange = false;
			return;
		}

		const mapBbox = _state.bbox;

		if (isBBoxOverlapping(LayerBbox, mapBbox)) {
			isLayerInRange = true;
		} else {
			isLayerInRange = false;
		}
	};

	// TODO: 使用してない
	// $effect(() => {
	// 	if (isLayerInRange) {
	// 		const attributionItem = {
	// 			id: layerEntry.id,
	// 			key: layerEntry.metaData.attribution
	// 		};
	// 		layerAttributions.add(attributionItem);
	// 	} else {
	// 		layerAttributions.remove(layerEntry.id);
	// 	}
	// });

	onMount(() => {
		const state = mapStore.getState();

		checkRange(state);
	});

	mapStore.onStateChange((state) => {
		checkRange(state);
	});
</script>

<!-- 左側：レイヤータイプアイコン -->

<div class="sticky top-[0px] z-10 flex w-[50px] shrink-0 justify-center self-start">
	<div class="bg-base peer absolute z-10 aspect-square rounded-full p-1.5">
		<Icon icon={getLayerIcon(layerType)} class="h-5 w-5" />
	</div>
	<div
		class="bg-base pointer-events-none absolute top-10 z-10 w-[60px] rounded-full px-1 text-center text-xs opacity-0 transition-opacity duration-200 peer-hover:opacity-100"
	>
		{TYPE_LABELS[layerType]}
	</div>
</div>

<!-- 右側：レイヤーアイテム -->
<div class="flex-1">
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
</div>

<style>
	.c-rounded {
		border-radius: 9999px 9999px 9999px 9999px;
	}
	/* エフェクト要素 */
	.c-ripple-effect {
		opacity: 0;
		animation: ripple 1.5s linear infinite;
	}

	.c-ripple-effect2 {
		opacity: 0;
		animation: ripple 1.5s 0.75s linear infinite;
	}

	/* アニメーションの定義 */
	@keyframes ripple {
		0% {
			scale: 1;
			opacity: 0.8;
		}

		100% {
			scale: 1.3;
			opacity: 0;
		}
	}
</style>
