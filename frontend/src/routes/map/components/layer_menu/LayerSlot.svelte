<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fly, slide } from 'svelte/transition';

	import Legend from './Legend.svelte';
	import turfBbox, { bbox } from '@turf/bbox';
	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import OpacityRangeSlider from '$routes/map/components/layer_menu/OpacityRangeSlider.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { ColorsExpression } from '$routes/map/data/types/vector/style';
	import { selectedLayerId, isStyleEdit, showDataMenu } from '$routes/stores';
	import { activeLayerIdsStore, reorderStatus } from '$routes/stores/layers';
	import { mapStore, type MapState } from '$routes/stores/map';
	import { isBBoxOverlapping } from '$routes/map/utils/map';
	import { onMount } from 'svelte';
	import { layerAttributions } from '$routes/stores/attributions';
	import { getLayerIcon, TYPE_LABELS, type LayerType } from '$routes/map/utils/entries';

	interface Props {
		index: number;
		length: number;
		layerType: LayerType;
		layerEntry: GeoDataEntry;
		showDataEntry: GeoDataEntry | null; // データメニューの表示状態
		tempLayerEntries: GeoDataEntry[];
		enableFlip: boolean;
	}

	let {
		index,
		length,
		layerType,
		layerEntry = $bindable(),
		showDataEntry = $bindable(), // データメニューの表示状態
		tempLayerEntries = $bindable(),
		enableFlip = $bindable()
	}: Props = $props();
	let showLegend = $state(false);
	let isDragging = $state(false);
	let draggingEnabled = $state(true);

	let isHovered = $state(false);
	let isCheckBoxHovered = $state(false);
	let isLayerInRange = $state(false);

	let LayerBbox = $derived.by(() => {
		return layerEntry.metaData.bounds;
	});

	const selectedLayer = () => {
		// if ($selectedLayerId === layerEntry.id) {
		// 	$isStyleEdit = !$isStyleEdit;
		// 	return;
		// }
		selectedLayerId.set(layerEntry.id);

		if (!isLayerInRange && $isStyleEdit) mapStore.focusLayer(layerEntry);
	};

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

	$effect(() => {
		if (isLayerInRange) {
			const attributionItem = {
				id: layerEntry.id,
				key: layerEntry.metaData.attribution
			};
			layerAttributions.add(attributionItem);
		} else {
			layerAttributions.remove(layerEntry.id);
		}
	});

	onMount(() => {
		const state = mapStore.getState();

		checkRange(state);
	});

	mapStore.onStateChange((state) => {
		checkRange(state);
	});
</script>

<div
	class="relative flex h-[75px] w-full items-center
		transition-colors {isDragging ? 'c-dragging-style' : ''}"
	draggable={draggingEnabled}
	ondragstart={(e) => dragStart(e, layerEntry.id)}
	ondragenter={() => dragEnter(layerEntry.id)}
	ondragover={(e) => e.preventDefault()}
	onmousedown={(e) => handleMouseDown(e, layerEntry.id)}
	ondragend={dragEnd}
	role="button"
	tabindex="0"
	aria-label="レイヤー"
>
	{#if !$isStyleEdit && !$showDataMenu}
		<!-- レイヤーの種類 -->
		<div
			transition:slide={{ duration: 200, axis: 'x' }}
			class="relative grid h-full w-[50px] shrink-0 place-items-center"
		>
			{#if index === 0}
				<div class="bg-base peer absolute aspect-square rounded-full p-2">
					<Icon icon={getLayerIcon(layerType)} class="h-6 w-6" />
				</div>
				<div
					class="bg-base pointer-events-none absolute bottom-0 z-10 w-[60px] rounded-full px-1 text-center text-xs opacity-0 transition-opacity duration-200 peer-hover:opacity-100"
				>
					{TYPE_LABELS[layerType]}
				</div>
			{:else}
				<div class="bg-base absolute aspect-square rounded-full p-1"></div>
			{/if}
			<div class="bg-base/60 h-full w-[2px]"></div>
			<!-- <div class="bg-base/60 absolute right-0 -z-10 h-[2px] w-1/2"></div> -->
		</div>
	{/if}
	<div
		id={layerEntry.id}
		class="c-dragging-style translate-z-0 relative flex cursor-move select-none justify-center text-clip text-nowrap p-2 text-left drop-shadow-[0_0_2px_rgba(220,220,220,0.8)] duration-100
			{$selectedLayerId !== layerEntry.id && $isStyleEdit
			? 'rounded-lg bg-black/50'
			: $isStyleEdit
				? 'bg-main rounded-lg'
				: 'rounded-full bg-black'}"
		onmouseenter={() => (isHovered = true)}
		onmouseleave={() => (isHovered = false)}
		role="button"
		tabindex="0"
		style={`width: ${$showDataMenu ? '66px' : $isStyleEdit ? '400px' : '330px'};transition-property: width, transform, translate, scale, rotate, height; transition-duration: 0.2s; transition-timing-function: ease-in-out;`}
	>
		<div class="flex w-full items-center justify-start gap-2 bg-transparent">
			<!-- アイコン -->
			<button
				onclick={selectedLayer}
				class="bg-base relative isolate grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full text-base transition-transform duration-150 {$isStyleEdit
					? 'translate-x-[320px]'
					: ''} {$selectedLayerId !== layerEntry.id && $isStyleEdit ? 'opacity-50' : 'opacity-100'}"
			>
				<LayerIcon {layerEntry} />
			</button>

			<div class="relative flex w-full grow flex-col items-start gap-[2px] overflow-hidden">
				{#if !$isStyleEdit}
					<!-- レイヤー名 -->
					<div class="flex flex-col">
						<span class="truncate text-base {showLegend ? 'text-main' : 'text-base'}"
							>{layerEntry.metaData.name}</span
						>
						<div class="flex items-center">
							<Icon icon="lets-icons:info-alt-fill" class="h-5 w-5 text-gray-500" />
							<span class="truncate text-xs text-gray-400"
								>{layerEntry.metaData.attribution ?? '---'}</span
							>
						</div>
					</div>
				{/if}

				{#if isHovered && !$isStyleEdit}
					<!-- 編集ボタン -->
					<div
						transition:fly={{ duration: 200, y: 10, opacity: 0 }}
						class="absolute flex h-full w-full gap-4 bg-black text-gray-100"
					>
						<button
							onclick={() => (layerEntry.style.visible = !layerEntry.style.visible)}
							class="cursor-pointer"
						>
							<Icon
								icon={layerEntry.style.visible ? 'akar-icons:eye' : 'akar-icons:eye-slashed'}
								class="h-8 w-8"
							/>
						</button>

						<button onclick={removeLayer} class="cursor-pointer">
							<Icon icon="bx:trash" class="h-8 w-8" />
						</button>

						{#if layerEntry.metaData.location !== '全国' && layerEntry.metaData.location !== '世界'}
							<button class="cursor-pointer" onclick={focusLayer}>
								<Icon icon="hugeicons:target-03" class="h-8 w-8" />
							</button>
						{/if}

						<!-- <button onclick={copyLayer}>
							<Icon icon="lucide:copy" />
						</button> -->
						<button onclick={editLayer} class="ml-auto mr-4 cursor-pointer">
							<Icon icon="mdi:mixer-settings" class="ml-4 h-8 w-8" />
						</button>
						<!-- <button onclick={infoLayer} class="cursor-pointer">
							<Icon icon="akar-icons:info" class="h-8 w-8" />
						</button> -->
					</div>
				{/if}
			</div>
		</div>
		<!-- ステータス -->
		{#if !$showDataMenu}
			<div
				class="pointer-events-none absolute bottom-[0px] left-[0px] z-10 grid h-6 w-6 place-items-center rounded-full border-4 border-black text-sm transition-colors duration-300 {!layerEntry
					.style.visible
					? 'bg-gray-500'
					: isLayerInRange
						? 'bg-green-500'
						: 'bg-red-500'}"
			></div>
		{/if}
		<!-- ステータス -->
		{#if $showDataMenu}
			<div
				class="bg-base pointer-events-none absolute bottom-[0px] left-[0px] z-10 grid place-items-center rounded-full border-4 border-black p-1"
			>
				<Icon icon={getLayerIcon(layerType)} class="h-4 w-4" />
			</div>
		{/if}
	</div>
</div>

<style>
	.c-fog {
		background: rgb(233, 233, 233);
		background: linear-gradient(90deg, rgb(0, 93, 3) 10%, rgba(233, 233, 233, 0) 100%);
	}
</style>
