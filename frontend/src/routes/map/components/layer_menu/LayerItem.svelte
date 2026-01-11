<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import FacIcon from '$lib/components/svgs/FacIcon.svelte';
	import PrefectureIcon from '$lib/components/svgs/prefectures/PrefectureIcon.svelte';
	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import { getAttributionName } from '$routes/map/data/entries/meta_data/attribution';
	import { getPrefectureCode } from '$routes/map/data/pref';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { getLayerIcon, type LayerType } from '$routes/map/utils/entries';
	import { isBBoxOverlapping } from '$routes/map/utils/map';
	import { checkMobile, checkPc } from '$routes/map/utils/ui';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import { activeLayerIdsStore, reorderStatus } from '$routes/stores/layers';
	import { mapStore, type MapState } from '$routes/stores/map';
	import { isActiveMobileMenu, showDataMenu } from '$routes/stores/ui';

	interface Props {
		index: number;
		length: number;
		layerType: LayerType;
		layerEntry: GeoDataEntry;
		showDataEntry: GeoDataEntry | null; // データメニューの表示状態
		tempLayerEntries: GeoDataEntry[];
		enableFlip: boolean;
		isDraggingLayerType: LayerType | null; // ドラッグ中のレイヤータイプ
		isHoveredLayerType: LayerType | null; // ホバー中のレイヤータイプ
		featureMenuData: FeatureMenuData | null;
		isTouchDragging: boolean; // タッチデバイスでのドラッグ中かどうか
	}

	let {
		index,
		length,
		layerType,
		layerEntry = $bindable(),
		showDataEntry = $bindable(), // データメニューの表示状態
		tempLayerEntries = $bindable(),
		enableFlip = $bindable(),
		isDraggingLayerType = $bindable(), // ドラッグ中のレイヤータイプ
		isHoveredLayerType = $bindable(), // ホバー中のレイヤータイプ
		featureMenuData = $bindable(),
		isTouchDragging = $bindable() // タッチデバイスでのドラッグ中かどうか
	}: Props = $props();
	let showLegend = $state(false);
	let showMobileLegend = $state(false);
	let layerItemElement: HTMLDivElement;
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

		// 属性メニューが開いている場合は閉じる
		featureMenuData = null;

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

	// タッチイベント用の状態
	let touchStartY = 0;
	let touchCurrentY = 0;

	let dragElement: HTMLElement | null = null;
	let dragClone: HTMLElement | null = null;

	// スマホ用のドラッグ処理
	const handleTouchStart = (e: TouchEvent, layerId: string) => {
		if (!draggingEnabled || !checkMobile()) return;

		const touch = e.touches[0];
		touchStartY = touch.clientY;
		touchCurrentY = touch.clientY;

		dragElement = document.getElementById(layerId);
		if (!dragElement) return;

		// 長押し判定用のタイマー
		const longPressTimer = setTimeout(() => {
			isTouchDragging = true;
			isDragging = true;
			enableFlip = false;
			showLegend = false;
			isDraggingLayerType = layerType;
			selectedLayerId.set(layerId);

			// ドラッグ用のクローン要素を作成
			if (dragElement) {
				dragClone = dragElement.cloneNode(true) as HTMLElement;
				dragClone.style.position = 'fixed';
				dragClone.style.left = `${dragElement.getBoundingClientRect().left}px`;
				dragClone.style.top = `${touch.clientY - 40}px`;
				dragClone.style.width = `${dragElement.offsetWidth}px`;
				dragClone.style.zIndex = '9999';
				dragClone.style.opacity = '0.8';
				dragClone.style.pointerEvents = 'none';
				dragClone.style.transition = 'none';
				document.body.appendChild(dragClone);
			}
		}, 200);

		// タッチ終了時にタイマーをクリア
		const clearTimer = () => {
			clearTimeout(longPressTimer);
			document.removeEventListener('touchend', clearTimer);
			document.removeEventListener('touchmove', handleEarlyMove);
		};

		// 早期の移動でタイマーをクリア（長押し前の移動）
		const handleEarlyMove = (moveEvent: TouchEvent) => {
			const moveTouch = moveEvent.touches[0];
			if (Math.abs(moveTouch.clientY - touchStartY) > 10 && !isTouchDragging) {
				clearTimer();
			}
		};

		document.addEventListener('touchend', clearTimer, { once: true });
		document.addEventListener('touchmove', handleEarlyMove);
	};

	// スマホ用のドラッグ処理
	const handleTouchMove = (e: TouchEvent) => {
		if (!isTouchDragging || !checkMobile()) return;

		e.preventDefault();
		const touch = e.touches[0];
		touchCurrentY = touch.clientY;

		// クローン要素を移動
		if (dragClone) {
			dragClone.style.top = `${touch.clientY - 40}px`;
		}

		// タッチ位置にある要素を検出してドラッグエンターを発火
		const elementsAtPoint = document.elementsFromPoint(touch.clientX, touch.clientY);
		for (const elem of elementsAtPoint) {
			const layerItem = elem.closest('[data-layer-id]') as HTMLElement;
			if (layerItem && layerItem.dataset.layerId !== layerEntry.id) {
				const targetLayerId = layerItem.dataset.layerId;
				if (targetLayerId && $selectedLayerId !== targetLayerId) {
					activeLayerIdsStore.reorder($selectedLayerId, targetLayerId);
				}
				break;
			}
		}
	};

	// スマホ用のドラッグ処理
	const handleTouchEnd = () => {
		if (!isTouchDragging || !checkMobile()) return;

		// クローン要素を削除
		if (dragClone) {
			dragClone.remove();
			dragClone = null;
		}

		isTouchDragging = false;
		isDragging = false;
		enableFlip = true;
		isDraggingLayerType = null;
		reorderStatus.set('idle');
		dragElement = null;
	};

	const hoverLayerItem = (bool: boolean) => {
		isHovered = bool;
		isHoveredLayerType = bool ? layerType : null;
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

		// passive: false を指定してtouchmoveでpreventDefault()を使えるようにする
		layerItemElement?.addEventListener('touchmove', handleTouchMove, { passive: false });

		return () => {
			layerItemElement?.removeEventListener('touchmove', handleTouchMove);
		};
	});

	mapStore.onStateChange((state) => {
		checkRange(state);
	});

	let prefCode = $derived.by(() => {
		return getPrefectureCode(layerEntry.metaData.location);
	});
</script>

<div
	bind:this={layerItemElement}
	class="relative flex h-[80px] w-full items-center
		transition-colors {isDragging ? 'c-dragging-style' : ''}"
	data-layer-id={layerEntry.id}
	draggable={draggingEnabled}
	ondragstart={(e) => dragStart(e, layerEntry.id)}
	ondragenter={() => dragEnter(layerEntry.id)}
	ondragover={(e) => e.preventDefault()}
	onmousedown={(e) => handleMouseDown(e, layerEntry.id)}
	ondragend={dragEnd}
	ontouchstart={(e) => handleTouchStart(e, layerEntry.id)}
	ontouchend={handleTouchEnd}
	role="button"
	tabindex="0"
	aria-label="レイヤー"
>
	{#if !$isStyleEdit && !$showDataMenu}
		<div
			transition:slide={{ duration: 200, axis: 'x' }}
			class="relative flex h-full w-[50px] shrink-0 items-center justify-center"
		>
			<div
				class="absolute h-full w-[2px] {isHoveredLayerType === layerType
					? 'bg-accent '
					: 'bg-base/60'}"
			></div>
		</div>
	{/if}
	<div
		id={layerEntry.id}
		class="transform-[width, transform, translate, scale, rotate, height] c-rounded relative flex translate-z-0 cursor-move justify-center p-2 text-left text-nowrap text-clip duration-200 select-none
			{$selectedLayerId !== layerEntry.id && $isStyleEdit ? 'bg-black ' : ''} {$selectedLayerId ===
			layerEntry.id && $isStyleEdit
			? 'bg-base'
			: ''} {$showDataMenu || $isStyleEdit
			? 'w-[66px]'
			: 'overflow-hidden max-lg:w-[calc(100%_-_55px)] lg:w-[330px]'} {$isStyleEdit
			? 'translate-x-[310px]'
			: 'border-sub border-1 bg-black'} "
		onmouseenter={() => (checkPc() ? hoverLayerItem(true) : null)}
		onmouseleave={() => (checkPc() ? hoverLayerItem(false) : null)}
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

		{#if !isHovered && !$isStyleEdit && !$showDataMenu && !showMobileLegend}
			<div
				transition:fade={{ duration: 100 }}
				class="absolute top-2 right-4 grid place-items-center opacity-10"
			>
				{#if layerEntry.metaData.location === '森林文化アカデミー'}
					<div class="grid place-items-center [&_path]:fill-white">
						<FacIcon width={'60px'} />
					</div>
				{/if}
				{#if prefCode}
					<div class="[&_path]:fill-base grid aspect-square place-items-center">
						<PrefectureIcon width={'80px'} code={prefCode} />
					</div>
				{/if}
				{#if layerEntry.metaData.location === '全国'}
					<div class="grid place-items-center">
						<Icon icon="emojione-monotone:map-of-japan" class="h-20 w-20 text-base" />
					</div>
				{/if}
				{#if layerEntry.metaData.location === '世界'}
					<div class="grid place-items-center">
						<Icon icon="fxemoji:worldmap" class="[&_path]:fill-base h-20 w-20" />
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex w-full items-center justify-start gap-1 bg-transparent">
			<!-- アイコン -->
			<button
				onclick={selectedLayer}
				class="relative isolate grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-black text-base transition-transform duration-150 {$isStyleEdit
					? ''
					: ''} {($selectedLayerId === layerEntry.id && $isStyleEdit) || isHovered
					? 'scale-115'
					: ''}"
			>
				<div
					class="h-full w-full scale-200 {layerEntry.style.visible
						? ''
						: 'brightness-75 grayscale'}"
				>
					<LayerIcon {layerEntry} />
				</div>
			</button>

			<!-- レイヤー名 -->
			<div class="relative flex h-full w-full grow flex-col items-start overflow-hidden">
				{#if !$isStyleEdit}
					<!-- レイヤー名 -->
					<div class="flex h-full w-full flex-col gap-[2px]">
						<span class="truncate pt-2 pl-1 text-base">{layerEntry.metaData.name}</span>
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
						class="absolute flex h-full w-full gap-4 rounded-r-full bg-black pl-2 text-gray-100"
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
						<button onclick={editLayer} class="mr-4 ml-auto cursor-pointer">
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
						<button onclick={editLayer} class="mr-4 ml-auto cursor-pointer">
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
					class="grid translate-x-3 place-items-center px-2 py-2"
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
