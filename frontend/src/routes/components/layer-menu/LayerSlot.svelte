<script lang="ts">
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';
	import { fade } from 'svelte/transition';

	import Legend from './Legend.svelte';

	import LayerIcon from '$routes/components/atoms/LayerIcon.svelte';
	import OpacityRangeSlider from '$routes/components/layer-menu/OpacityRangeSlider.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { ColorsExpression } from '$routes/data/types/vector/style';
	import { selectedLayerId, isStyleEdit, showDataMenu } from '$routes/store';
	import {
		orderedLayerIds,
		groupedLayerStore,
		reorderStatus,
		type LayerType
	} from '$routes/store/layers';
	import { mapStore } from '$routes/store/map';

	interface Props {
		layerEntry: GeoDataEntry;
		tempLayerEntries: GeoDataEntry[];
		enableFlip: boolean;
		dragEnterType: LayerType | null;
	}

	let {
		layerEntry = $bindable(),
		tempLayerEntries = $bindable(),
		enableFlip = $bindable(),
		dragEnterType = $bindable()
	}: Props = $props();
	let showLegend = $state(false);
	let isDragging = $state(false);
	let draggingEnabled = $state(true);

	let isHovered = $state(false);
	let isCheckBoxHovered = $state(false);

	let layerType = $derived.by((): LayerType | unknown => {
		if (layerEntry) {
			if (layerEntry.type === 'raster') {
				return 'raster';
			} else if (layerEntry.type === 'vector') {
				if (layerEntry.format.geometryType === 'Label') {
					return 'label';
				} else if (layerEntry.format.geometryType === 'Point') {
					return 'point';
				} else if (layerEntry.format.geometryType === 'LineString') {
					return 'line';
				} else if (layerEntry.format.geometryType === 'Polygon') {
					return 'polygon';
				}
			}
		}
	});

	const selectedLayer = () => {
		selectedLayerId.set(layerEntry.id);
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
	// const copyLayer = () => {
	// 	if (!layerEntry) return;
	// 	$isStyleEdit = false;
	// 	const uuid = crypto.randomUUID();
	// 	const copy: GeoDataEntry = JSON.parse(JSON.stringify(layerEntry)); // 深いコピーを作成

	// 	copy.id = uuid;
	// 	copy.metaData.name = `${layerEntry.metaData.name} (コピー)`;

	// 	tempLayerEntries = [...tempLayerEntries, copy];
	// 	orderedLayerIds.addLayer(uuid);
	// };

	// レイヤーの削除
	const removeLayer = () => {
		$isStyleEdit = false;
		if (!layerEntry) return;
		groupedLayerStore.remove(layerEntry.id);
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

	const infoLayer = () => {
		toggleChecked(layerEntry.id);
		if (!layerEntry) return;
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
		dragEnterType = layerType as LayerType;
		selectedLayerId.set(layerId);
	};

	// ドラッグ中のレイヤーを取得
	const dragEnter = (layerId: string) => {
		if (layerId && $selectedLayerId !== layerId) {
			groupedLayerStore.reorderWithinTypeById(layerType as LayerType, $selectedLayerId, layerId);
		}
	};

	// ドラッグ終了時にアニメーションを有効にする
	const dragEnd = () => {
		isDragging = false;
		enableFlip = true;
		dragEnterType = null;
		reorderStatus.set('idle');
	};
</script>

<div
	class="relative flex flex-col
		rounded-[2.1rem] transition-colors {dragEnterType !== null && dragEnterType !== layerType
		? 'opacity-50'
		: ''} {isDragging ? 'c-dragging-style' : ''} {showLegend ? 'bg-base/50' : ''}"
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
	<div
		id={layerEntry.id}
		class="bg-main c-dragging-style c-shadow relative z-10 cursor-move select-none text-clip text-nowrap rounded-full p-2 text-left transition-transform duration-100 {$isStyleEdit
			? 'w-[65px]'
			: ''} {$selectedLayerId === layerEntry.id
			? 'drop-shadow-[0_0_2px_rgba(30,230,20,0.8)]'
			: 'drop-shadow-[0_0_2px_rgba(220,220,220,0.8)]'} "
		onmouseenter={() => (isHovered = true)}
		onmouseleave={() => (isHovered = false)}
		role="button"
		tabindex="0"
	>
		<div class="flex w-full items-center justify-start gap-2 bg-transparent">
			<!-- アイコン -->
			<button
				onclick={selectedLayer}
				class="bg-base relative isolate grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full text-base"
			>
				<LayerIcon {layerEntry} />

				<!-- 表示トグル -->
				<!-- {#if isHovered || !layerEntry.style.visible}
					<div
						transition:fade={{ duration: 100 }}
						class="pointer-events-none absolute grid h-full w-full place-items-center bg-black/50"
					></div>
					<div
						transition:fade={{ duration: 100 }}
						class="pointer-events-none absolute {layerEntry.style.visible
							? 'text-accent'
							: 'text-neutral-200'}"
					>
						<Icon
							icon={layerEntry.style.visible ? 'akar-icons:eye-open' : 'akar-icons:eye-slashed'}
							width={30}
						/>
					</div>
				{/if} -->
			</button>

			<div class="relative flex w-full grow flex-col items-start gap-[2px] overflow-hidden">
				{#if !isHovered}
					<div transition:slide={{ duration: 200 }} class="flex flex-col">
						<span class="truncate text-base {showLegend ? 'text-main' : 'text-base'}"
							>{layerEntry.metaData.name}</span
						>
						<span class="truncate text-xs text-gray-400"
							>{layerEntry.metaData.location ?? '---'}</span
						>
					</div>
				{/if}

				{#if isHovered}
					<div transition:slide={{ duration: 200 }} class="flex gap-4 text-gray-100">
						<button
							onclick={() => (layerEntry.style.visible = !layerEntry.style.visible)}
							class="cursor-pointer"
						>
							<Icon
								icon={layerEntry.style.visible ? 'akar-icons:eye' : 'akar-icons:eye-slashed'}
								class="h-8 w-8"
							/>
						</button>

						{#if layerEntry.metaData.location !== '全国' && layerEntry.metaData.location !== '世界'}
							<button class="cursor-pointer" onclick={focusLayer}>
								<Icon icon="hugeicons:target-03" class="h-8 w-8" />
							</button>
						{/if}

						<!-- <button onclick={copyLayer}>
                                            <Icon icon="lucide:copy" />
                                        </button> -->
						<button onclick={editLayer} class="cursor-pointer">
							<Icon icon="mdi:mixer-settings" class="ml-4 h-8 w-8" />
						</button>
						<button onclick={infoLayer} class="cursor-pointer">
							<Icon icon="akar-icons:info" class="h-8 w-8" />
						</button>
						<button onclick={removeLayer} class="cursor-pointer">
							<Icon icon="bx:trash" class="h-8 w-8" />
						</button>
					</div>
				{/if}
			</div>

			<!-- トグル -->
			<!-- <label
				class="relative ml-auto mr-2 grid shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full"
			>
				<input
					type="checkbox"
					class="hidden"
					oninput={() => {
						toggleChecked(layerEntry.id);
					}}
				/>
				<Icon
					icon="weui:arrow-filled"
					class="h-8 w-8 transition-transform duration-150 {showLegend
						? 'text-main -rotate-90'
						: 'rotate-90 text-base'}"
				/>
			</label> -->
		</div>
	</div>
	<div
		class="border-main bg-base pointer-events-none absolute bottom-0 z-10 grid h-6 w-6 place-items-center rounded-full border-2 text-sm"
	>
		{layerEntry.metaData.maxZoom}
	</div>
	<!-- {#if showLegend}
		<div transition:slide={{ duration: 200 }} class="flex pb-4 pl-[20px]">
			<div class="flex w-full flex-col gap-4 px-2 pt-2">
				<div
					class="w-full"
					onmousedown={() => (draggingEnabled = false)}
					onmouseup={() => (draggingEnabled = true)}
					role="button"
					tabindex="0"
				>
					<OpacityRangeSlider min={0} max={1} step={0.01} bind:value={layerEntry.style.opacity} />
				</div>
				<Legend {layerEntry} />
			</div>
		</div>
	{/if} -->
</div>

<style>
	@property --angle {
		syntax: '<angle>';
		inherits: true;
		initial-value: 0deg;
	}

	.c-rounded {
		border-radius: 9999px 9999px 9999px 9999px;
	}
</style>
