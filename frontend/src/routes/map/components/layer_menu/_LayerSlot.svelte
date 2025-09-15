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

	interface Props {
		index: number;
		length: number;
		layerType: LayerType;
		layerEntry: GeoDataEntry;
		layerEntries: GeoDataEntry[];
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
		layerEntries = $bindable(),
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

<div
	class="relative flex h-[80px] w-full items-center
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
			class="relative flex h-full w-[50px] shrink-0 items-center justify-center"
		>
			{#if index === 0}
				<div class="bg-base peer absolute z-10 aspect-square rounded-full p-1.5">
					<Icon icon={getLayerIcon(layerType)} class="h-5 w-5" />
				</div>
				<div
					class="bg-base pointer-events-none absolute bottom-0 z-10 w-[60px] rounded-full px-1 text-center text-xs opacity-0 transition-opacity duration-200 peer-hover:opacity-100"
				>
					{TYPE_LABELS[layerType]}
				</div>

				<div
					class="bg-sub z-0 w-[40px] {length > 1
						? 'h-full translate-y-[25%] rounded-t-full'
						: 'h-1/2 rounded-full'}"
				></div>
			{:else if index === length - 1}
				<div class="bg-sub z-0 h-full w-[40px] -translate-y-[25%] rounded-b-full"></div>
			{:else}
				<div class="bg-sub z-0 h-full w-[40px]"></div>
			{/if}
			<div class="bg-base/60 absolute -z-10 h-full w-[2px]"></div>
			<!-- <div class="bg-base/60 absolute right-0 -z-10 h-[2px] w-1/2"></div> -->
		</div>
	{/if}

	<div
		id={layerEntry.id}
		class="translate-z-0 transform-[width, transform, translate, scale, rotate, height] c-rounded relative flex cursor-move select-none justify-center text-clip text-nowrap p-2 text-left duration-200
			{$selectedLayerId !== layerEntry.id && $isStyleEdit ? 'bg-black ' : ''} {$selectedLayerId ===
			layerEntry.id && $isStyleEdit
			? 'bg-base'
			: ''} {$showDataMenu || $isStyleEdit
			? 'w-[66px]'
			: 'max-lg:w-[calc(100%_-_55px)] lg:w-[330px]'} {$isStyleEdit
			? 'translate-x-[310px]'
			: 'border-1 border-sub bg-black'} "
		onmouseenter={() => (checkPc() ? (isHovered = true) : null)}
		onmouseleave={() => (checkPc() ? (isHovered = false) : null)}
		role="button"
		tabindex="0"
	>
		<!-- エフェクト -->
		{#if $selectedLayerId === layerEntry.id && $isStyleEdit}
			<div
				class="c-ripple-effect absolute top-0 h-full w-full rounded-full border-2 border-amber-50"
			></div>
			<div
				class="c-ripple-effect2 absolute top-0 h-full w-full rounded-full border-2 border-amber-50"
			></div>
		{/if}

		<div class="flex w-full items-center justify-start gap-1 bg-transparent">
			<!-- アイコン -->
			<button
				onclick={selectedLayer}
				class="relative isolate grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-black text-base transition-transform duration-150 {$isStyleEdit
					? ''
					: ''} {$selectedLayerId === layerEntry.id && $isStyleEdit ? 'scale-115' : ''}"
			>
				<div class="scale-200 h-full w-full {layerEntry.style.visible ? '' : 'grayscale'}">
					<LayerIcon {layerEntry} />
				</div>
			</button>

			<!-- レイヤー名 -->
			<div class="relative flex h-full w-full grow flex-col items-start overflow-hidden">
				{#if !$isStyleEdit}
					<!-- レイヤー名 -->
					<div class="flex h-full w-full flex-col gap-[2px]">
						<span class="truncate pl-1 pt-2 text-base">{layerEntry.metaData.name}</span>
						<div class="mt-auto flex pl-1">
							<!-- <Icon icon="lets-icons:info-alt-fill" class="h-4 w-4 text-gray-500" /> -->
							<span class="truncate text-xs text-gray-400"
								>{getAttributionName(layerEntry.metaData.attribution) ?? '---'}</span
							>
							<!-- <span class="truncate text-xs text-gray-400"
								>{layerEntry.metaData.location ?? '---'}</span
							> -->
						</div>
					</div>
				{/if}

				{#if isHovered && !$isStyleEdit}
					<!-- 編集ボタン -->
					<div
						transition:fly={{ duration: 200, y: 10, opacity: 0 }}
						class="absolute flex h-full w-full gap-4 rounded-r-full bg-black pl-1 text-gray-100"
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

				<!-- TODO:モバイル -->
				{#if showMobileLegend && $selectedLayerId === layerEntry.id && checkMobile()}
					<!-- 編集ボタン モバイル -->
					<div
						transition:fly={{ duration: 200, y: 10, opacity: 0 }}
						class="absolute flex h-full w-full gap-4 rounded-r-full bg-black pl-1 text-gray-100"
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

			{#if checkMobile()}
				<button
					onclick={() => {
						$selectedLayerId = layerEntry.id;
						showMobileLegend = !showMobileLegend;
					}}
					class=" grid place-items-center"
				>
					<Icon icon="pepicons-pencil:dots-y" class="h-8 w-8 text-base" />
				</button>
			{/if}
		</div>
		<!-- ステータス -->
		{#if !$showDataMenu && !$isStyleEdit}
			<div
				class="pointer-events-none absolute bottom-[4px] left-[40px] z-10 grid h-6 w-6 place-items-center rounded-full border-4 border-black text-sm transition-colors duration-300 {!layerEntry
					.style.visible
					? 'bg-gray-500'
					: isLayerInRange
						? 'bg-accent'
						: 'bg-red-400'}"
			></div>
		{/if}

		<!-- タイプ -->
		{#if $showDataMenu}
			<div
				class="bg-base pointer-events-none absolute bottom-[0px] left-[0px] z-10 grid place-items-center rounded-full border-4 border-black p-1"
			>
				<Icon icon={getLayerIcon(layerType)} class="h-4 w-4" />
			</div>
		{/if}

		<!-- 選択中 -->
		<!-- {#if $selectedLayerId === layerEntry.id && $isStyleEdit}
			<div
				class="c-ripple-anime absolute top-0 -z-10 aspect-square shrink-0 -translate-y-[3px] rounded-r-full p-9 shadow-md"
			></div>
		{/if} -->
	</div>
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
