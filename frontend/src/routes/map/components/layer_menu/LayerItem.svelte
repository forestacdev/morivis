<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import FacIcon from '$lib/components/svgs/FacIcon.svelte';
	import PrefectureIcon from '$lib/components/svgs/prefectures/PrefectureIcon.svelte';
	import { ICONS, getVisibilityIconName } from '$lib/icons';
	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import { registerInitialEntryStyle } from '$routes/map/data/entries';
	import { getAttributionName } from '$routes/map/data/entries/_meta_data/_attribution';
	import { getPrefectureCode } from '$routes/map/data/pref';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { getLayerIcon, type LayerType } from '$routes/map/utils/entries';
	import { GeojsonCache } from '$routes/map/utils/file/geojson';
	import { GeoTiffCache } from '$routes/map/utils/file/geotiff';
	import { checkMobile, checkPc } from '$routes/map/utils/ui';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import { activeLayerIdsStore, reorderStatus } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';
	import { isActiveMobileMenu, showDataMenu } from '$routes/stores/ui';

	interface Props {
		index: number;
		length: number;
		isLast: boolean;
		layerType: LayerType;
		layerEntry: GeoDataEntry;
		showDataEntry: GeoDataEntry | null; // データメニューの表示状態
		tempLayerEntries: GeoDataEntry[];
		enableFlip: boolean;
		isDraggingLayerType: LayerType | null; // ドラッグ中のレイヤータイプ
		isHoveredLayerType: LayerType | null; // ホバー中のレイヤータイプ
		isLayerInRange: boolean;
		featureMenuData: FeatureMenuData | null;
		isTouchDragging: boolean; // タッチデバイスでのドラッグ中かどうか
		isRecommendedDataDragging: boolean;
		isDeleteOverlayActive: boolean;
	}

	let {
		index,
		length,
		isLast,
		layerType,
		layerEntry = $bindable(),
		showDataEntry = $bindable(), // データメニューの表示状態
		tempLayerEntries = $bindable(),
		enableFlip = $bindable(),
		isDraggingLayerType = $bindable(), // ドラッグ中のレイヤータイプ
		isHoveredLayerType = $bindable(), // ホバー中のレイヤータイプ
		isLayerInRange,
		featureMenuData = $bindable(),
		isTouchDragging = $bindable(), // タッチデバイスでのドラッグ中かどうか
		isRecommendedDataDragging,
		isDeleteOverlayActive
	}: Props = $props();
	let showLegend = $state(false);
	let showMobileLegend = $state(false);
	let layerItemElement: HTMLDivElement;
	let isDragging = $state(false);
	let draggingEnabled = $state(true);

	let isHovered = $state(false);
	let isCheckBoxHovered = $state(false);

	let isGeojsonCustomLayer = $derived.by(() => {
		return (
			layerEntry.type === 'vector' &&
			layerEntry.format.geometryType &&
			layerEntry.format.type === 'geojson' &&
			layerEntry?.metaData.isUserUploaded
		);
	});

	let isTiffCustomLayer = $derived.by(() => {
		return (
			layerEntry.type === 'raster' &&
			layerEntry.format.type === 'image' &&
			'style' in layerEntry &&
			(layerEntry as { style: { type: string } }).style.type === 'tiff' &&
			layerEntry?.metaData.isUserUploaded
		);
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

		registerInitialEntryStyle(copy);
		tempLayerEntries = [...tempLayerEntries, copy];

		activeLayerIdsStore.add(uuid);
	};

	const downloadLayer = () => {
		if (!layerEntry) return;

		if (isGeojsonCustomLayer) {
			GeojsonCache.export(layerEntry.id, layerEntry.metaData.name);
		} else if (isTiffCustomLayer) {
			GeoTiffCache.exportRenderedPng(layerEntry.id);
		}
	};

	// レイヤーの削除
	const revokeBlobUrls = () => {
		if (!layerEntry) return;
		// GeoJSON内のBlobURL（位置情報付き写真等）を解放
		if (layerEntry.type === 'vector' && layerEntry.format.type === 'geojson') {
			const geojson = GeojsonCache.get(layerEntry.id);
			if (geojson) {
				for (const f of geojson.features) {
					const props = f.properties as Record<string, unknown> | null;
					if (props) {
						for (const v of Object.values(props)) {
							if (typeof v === 'string' && v.startsWith('blob:')) {
								URL.revokeObjectURL(v);
							}
						}
					}
				}
			}
		}
		// GLB/OBJ/MTLのBlobURL解放
		if (layerEntry.type === 'model' && 'url' in layerEntry.format) {
			const url = (layerEntry.format as { url?: string }).url;
			if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
			const mtlUrl = (layerEntry.format as { mtlUrl?: string }).mtlUrl;
			if (mtlUrl?.startsWith('blob:')) URL.revokeObjectURL(mtlUrl);
		}
	};

	const removeLayer = () => {
		$isStyleEdit = false;
		if (!layerEntry) return;

		// BlobURLの解放
		revokeBlobUrls();

		// キャッシュの解放
		if (isTiffCustomLayer) {
			GeoTiffCache.release(layerEntry.id);
		} else if (isGeojsonCustomLayer) {
			GeojsonCache.remove(layerEntry.id);
		} else if (layerEntry.type === 'model' && layerEntry.format.type === 'point-cloud') {
			// 点群データの明示的な解放
			layerEntry.format.positions = undefined;
			layerEntry.format.colors = undefined;
		}

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
		e.dataTransfer.setData('application/x-entry-id', layerId);
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
		if (isRecommendedDataDragging) return;
		if (isDraggingLayerType !== layerType) return;
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
		if (isRecommendedDataDragging) return;

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
				if (isDraggingLayerType !== layerType) break;
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
		// passive: false を指定してtouchmoveでpreventDefault()を使えるようにする
		layerItemElement?.addEventListener('touchmove', handleTouchMove, { passive: false });

		return () => {
			layerItemElement?.removeEventListener('touchmove', handleTouchMove);
		};
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
	<!-- 縦棒 -->
	{#if !$isStyleEdit && !$showDataMenu}
		<div
			transition:slide={{ duration: 200, axis: 'x' }}
			class="relative flex h-full w-[50px] shrink-0 items-center justify-center"
		>
			<div
				class="absolute top-0 w-[2px] {isLast ? 'h-1/2' : 'h-full'} {isHoveredLayerType ===
				layerType
					? 'bg-accent '
					: 'bg-gray-400'}"
			></div>
			<div
				class="absolute top-1/2 left-1/2 h-[1px] -translate-y-1/2 transition-[width] duration-150 {isHoveredLayerType ===
				layerType
					? 'bg-accent'
					: 'bg-gray-400'} {isHovered && !isDragging ? 'w-[25px]' : 'w-[10px]'}"
			></div>
		</div>
	{/if}

	<!-- レイヤーアイテム本体 -->
	<div
		id={layerEntry.id}
		class="transform-[width, transform, translate, scale, rotate, height border-color] relative flex translate-z-0 cursor-move justify-center rounded-full border-1 p-2 text-left text-nowrap text-clip duration-200 select-none
			{$selectedLayerId !== layerEntry.id && $isStyleEdit ? 'bg-black ' : ''} {$selectedLayerId ===
			layerEntry.id && $isStyleEdit
			? 'bg-base'
			: ''} {$showDataMenu || $isStyleEdit
			? 'w-[68.48px]'
			: 'overflow-hidden max-lg:w-[calc(100%_-_55px)] lg:w-[330px]'} {$isStyleEdit
			? 'translate-x-[310px]'
			: 'bg-black'}
            {isDeleteOverlayActive && isHovered && isDragging
			? 'border-red-500 drop-shadow-[0_0_3px_rgba(255,0,0,0.7)]'
			: isHovered
				? 'border-accent drop-shadow-[0_0_3px_color-accent]'
				: 'border-sub'}"
		onmouseenter={() => (checkPc() ? hoverLayerItem(true) : null)}
		onmouseleave={() => (checkPc() ? hoverLayerItem(false) : null)}
		role="button"
		tabindex="0"
	>
		<!-- 選択中リップルエフェクト -->
		{#if $selectedLayerId === layerEntry.id && $isStyleEdit}
			<div
				class="c-ripple-effect absolute top-0 h-full w-full rounded-full border-2 border-amber-50"
			></div>
			<div
				class="c-ripple-effect2 absolute top-0 h-full w-full rounded-full border-2 border-amber-50"
			></div>
		{/if}

		<!-- 背景アイコン -->
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
				{#if layerEntry.metaData.isUserUploaded}
					<div class="grid place-items-center">
						<Icon icon="mdi:file-upload-outline" class="h-18 w-18 rotate-6 text-base" />
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
							onclick={() => {
								layerEntry.style.visible = !layerEntry.style.visible;
							}}
							class="cursor-pointer"
						>
							<Icon icon={getVisibilityIconName(layerEntry.style.visible)} class="h-8 w-8" />
						</button>

						<button onclick={removeLayer} class="cursor-pointer">
							<Icon icon={ICONS.trash} class="h-8 w-8" />
						</button>

						{#if layerEntry.metaData.location !== '全国' && layerEntry.metaData.location !== '世界'}
							<button class="cursor-pointer" onclick={focusLayer}>
								<Icon icon={ICONS.lockOn} class="h-8 w-8" />
							</button>
						{/if}

						<!-- <button onclick={copyLayer}>
							<Icon icon="lucide:copy" />
						</button> -->
						{#if isGeojsonCustomLayer || isTiffCustomLayer}
							<button onclick={downloadLayer} class="cursor-pointer">
								<Icon icon={ICONS.download} class="h-8 w-8" />
							</button>
						{/if}
						<button onclick={editLayer} class="mr-4 ml-auto cursor-pointer">
							<Icon icon={ICONS.setting} class="ml-4 h-8 w-8" />
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
							<Icon icon={getVisibilityIconName(layerEntry.style.visible)} class="h-8 w-8" />
						</button>

						<!-- 削除 -->
						<button onclick={removeLayer} class="cursor-pointer">
							<Icon icon={ICONS.trash} class="h-8 w-8" />
						</button>

						{#if layerEntry.metaData.location !== '全国' && layerEntry.metaData.location !== '世界'}
							<button class="cursor-pointer" onclick={focusLayer}>
								<Icon icon={ICONS.lockOn} class="h-8 w-8" />
							</button>
						{/if}

						<!-- スタイル -->
						<button onclick={editLayer} class="mr-4 ml-auto cursor-pointer">
							<Icon icon={ICONS.setting} class="ml-4 h-8 w-8" />
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
						? 'bg-[#5afff7]'
						: 'bg-[#ff4f66]'}"
			></div>
		{/if}

		<!-- レイヤータイプ (データカタログ) -->
		{#if $showDataMenu}
			<div
				class="bg-base text-main pointer-events-none absolute bottom-[0px] left-[0px] z-10 grid place-items-center rounded-full border-4 border-black p-1"
			>
				<Icon icon={getLayerIcon(layerType)} class="h-4 w-4" />
			</div>
		{/if}
	</div>
</div>

<style>
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
