<script lang="ts">
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';
	import { fade } from 'svelte/transition';

	import Legend from './Legend.svelte';

	import LayerIcon from '$routes/components/atoms/LayerIcon.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { ColorsExpression } from '$routes/data/types/vector/style';
	import { showDataMenu } from '$routes/store';
	import { selectedLayerId, isEdit } from '$routes/store';
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
		if (isHovered || $isEdit) return;
		if ($selectedLayerId === layerEntry.id) {
			selectedLayerId.set('');
		} else {
			selectedLayerId.set(layerEntry.id);
		}
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
	// 	$isEdit = false;
	// 	const uuid = crypto.randomUUID();
	// 	const copy: GeoDataEntry = JSON.parse(JSON.stringify(layerEntry)); // 深いコピーを作成

	// 	copy.id = uuid;
	// 	copy.metaData.name = `${layerEntry.metaData.name} (コピー)`;

	// 	tempLayerEntries = [...tempLayerEntries, copy];
	// 	orderedLayerIds.addLayer(uuid);
	// };

	// レイヤーの削除
	const removeLayer = () => {
		$isEdit = false;
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
		$isEdit = !$isEdit;
	};

	const infoLayer = () => {
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
	class="relative flex flex-col transition-opacity {dragEnterType !== null &&
	dragEnterType !== layerType
		? 'opacity-50'
		: ''} {isDragging ? 'c-dragging-style' : ''}"
	draggable={true}
	ondragstart={(e) => dragStart(e, layerEntry.id)}
	ondragenter={() => dragEnter(layerEntry.id)}
	ondragover={(e) => e.preventDefault()}
	onmousedown={(e) => handleMouseDown(e, layerEntry.id)}
	ondragend={dragEnd}
	role="button"
	tabindex="0"
	aria-label="レイヤー"
>
	<button
		id={layerEntry.id}
		class="bg-main c-dragging-style c-rounded relative z-10 cursor-move select-none flex-col overflow-clip text-clip text-nowrap border-2 border-gray-500 p-2 text-left transition-colors duration-100 {$selectedLayerId ===
		layerEntry.id
			? 'css-gradient'
			: ' hover:border-accent'}"
		onclick={selectedLayer}
		style:width={!$showDataMenu ? '100%' : '70px'}
		style:transition="width 0.3s ease"
	>
		<div class="flex items-center justify-start gap-2">
			<label
				class="relative grid h-[50px] w-[50px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-600 text-base"
				onmouseenter={() => (isHovered = true)}
				onmouseleave={() => (isHovered = false)}
			>
				<input type="checkbox" class="hidden" oninput={() => toggleChecked(layerEntry.id)} />
				{#if layerEntry.style.visible}
					<LayerIcon {layerEntry} />
				{/if}
				<!-- 表示トグル -->
				{#if isHovered || !layerEntry.style.visible}
					<div
						transition:fade={{ duration: 100 }}
						class="pointer-events-none absolute grid h-full w-full place-items-center bg-black bg-opacity-50"
					></div>
					<div
						transition:fade={{ duration: 100 }}
						class="pointer-events-none absolute {layerEntry.style.visible
							? 'text-red-500'
							: 'text-neutral-200'}"
					>
						<Icon icon="ic:round-power-settings-new" width={30} />
					</div>
				{/if}
			</label>
			<div>
				<div class="flex flex-col items-start gap-[2px] overflow-hidden">
					<span class="text-nowrap text-base {$selectedLayerId === layerEntry.id ? '' : ''}"
						>{layerEntry.metaData.name}</span
					>
					<span class="text-nowrap text-xs text-gray-400"
						>{layerEntry.metaData.location ?? '---'}</span
					>

					<!-- {#if $selectedLayerId === layerEntry.id && !$isEdit}
						<div transition:slide={{ duration: 200 }} id={layerEntry.id} class=""></div>
					{/if} -->
				</div>
			</div>
		</div>
	</button>
	{#if showLegend}
		<div transition:slide={{ duration: 200 }} class="flex pl-[33px]">
			<div class="w-[2px] items-stretch bg-gray-500"></div>

			<div class="flex w-full flex-col gap-4 px-2 pt-2">
				<div class="flex gap-4 text-gray-100">
					<button onclick={() => (layerEntry.style.visible = !layerEntry.style.visible)}>
						<Icon
							icon={layerEntry.style.visible ? 'akar-icons:eye' : 'akar-icons:eye-slashed'}
							class="h-8 w-8"
						/>
					</button>

					<button onclick={focusLayer}>
						<Icon icon="hugeicons:target-03" class="h-8 w-8" />
					</button>
					<!-- <button onclick={copyLayer}>
									<Icon icon="lucide:copy" />
								</button> -->
					<button onclick={editLayer}>
						<Icon icon="lucide:edit" class="ml-4 h-8 w-8" />
					</button>
					<button onclick={infoLayer}>
						<Icon icon="akar-icons:info" class="h-8 w-8" />
					</button>
					<button onclick={removeLayer} class="">
						<Icon icon="bx:trash" class="h-8 w-8" />
					</button>
				</div>
				<Legend {layerEntry} />
			</div>
		</div>
	{/if}
</div>

<style>
	@property --angle {
		syntax: '<angle>';
		inherits: true;
		initial-value: 0deg;
	}

	:root {
		--color1: #06ad22;
		--color2: #004b54;
	}

	.css-gradient {
		background: linear-gradient(-90deg, var(--color1), var(--color2));
		color: white;
	}

	.c-rounded {
		border-radius: 9999px 9999px 9999px 9999px;
	}
</style>
