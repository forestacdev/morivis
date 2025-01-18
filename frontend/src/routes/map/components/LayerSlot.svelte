<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { BackgroundLayerSpecification } from 'maplibre-gl';
	import { fade } from 'svelte/transition';

	import LayerIcon from '$map/components/LayerIcon.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import type { ColorsExpressions } from '$map/data/types/vector/style';
	import { addedLayerIds, showLayerOptionId, isEdit } from '$map/store';
	import { mapStore } from '$map/store/map';

	let {
		layerEntry = $bindable(),
		toggleVisible
	}: { layerEntry: GeoDataEntry; toggleVisible: (id: string) => void } = $props();
	let showColors = $state(false);

	const getColorPallet = (ColorsExpressions: ColorsExpressions[]) => {
		if (!layerEntry || layerEntry.type !== 'vector') return;
		const target = ColorsExpressions.find((color) => color.key === layerEntry.style.colors.key);
		if (!target) return;
		// if (target.type === 'step') {
		// 	return {
		// 		type: 'step',
		// 		mapping: generateNumberAndColorMap(target.mapping)
		// 	};
		// }
		return target;
	};

	let colorStyle = $derived.by(() => {
		if (!layerEntry || layerEntry.type !== 'vector') return;
		return getColorPallet(layerEntry.style.colors.expressions);
	});

	let isHovered = $state(false);
	let isCheckBoxHovered = $state(false);

	const toggleEdit = () => {
		if (isHovered || $isEdit) return;
		if ($showLayerOptionId === layerEntry.id) {
			showLayerOptionId.set('');
		} else {
			showLayerOptionId.set(layerEntry.id);
			mapStore.focusLayer(layerEntry);
		}
	};

	const toggleChecked = (id: string) => {
		showColors = !showColors;

		toggleVisible(id);
	};

	let overlayLayerId = '';

	const overlayLayer: BackgroundLayerSpecification = {
		id: 'overlay-layer',
		type: 'background',
		paint: {
			'background-color': '#FFFFFF',
			'background-opacity': 0.8
		}
	};

	let edit = false;

	// isEdit.subscribe((value) => {
	// 	console.log('isEdit:', value);
	// 	const map = mapStore.getMap();
	// 	if (!map) return;
	// 	if (value) {
	// 		const layersIds = map.getLayersOrder();

	// 		// 現在のレイヤーの上のれヤーを取得
	// 		const layerIndex = layersIds.indexOf(layerEntry.id);
	// 		overlayLayerId = layersIds[layerIndex + 1];

	// 		map.addLayer(overlayLayer);
	// 		map.moveLayer(layerEntry.id);

	// 		const center = map.getCenter();

	// 		map.panTo(center, {
	// 			pitch: 45,
	// 			bearing: -30,
	// 			duration: 600
	// 		});
	// 	} else {
	// 		if (!overlayLayerId) return;
	// 		if (!map.getLayer(overlayLayerId)) return;
	// 		map.moveLayer(layerEntry.id, overlayLayerId);
	// 		map.removeLayer('overlay-layer');

	// 		const center = map.getCenter();
	// 		map.panTo(center, {
	// 			pitch: 0,
	// 			bearing: 0,
	// 			duration: 600
	// 		});
	// 	}
	// });

	const setEdit = () => {
		const layerId = layerEntry.id;
		edit = !edit;
		const map = mapStore.getMap();
		if (!map) return;
		if (edit) {
			isEdit.set(true);
			const layersIds = map.getLayersOrder();

			// 現在のレイヤーの上のれヤーを取得
			const layerIndex = layersIds.indexOf(layerId);
			overlayLayerId = layersIds[layerIndex + 1];

			map.addLayer(overlayLayer);
			map.moveLayer(layerId);

			const center = map.getCenter();

			map.panTo(center, {
				pitch: 45,
				bearing: -30,
				duration: 600
			});
		} else {
			isEdit.set(false);
			if (!overlayLayerId) return;
			if (!map.getLayer(overlayLayerId)) return;
			map.moveLayer(layerId, overlayLayerId);
			map.removeLayer('overlay-layer');

			const center = map.getCenter();
			map.panTo(center, {
				pitch: 0,
				bearing: 0,
				duration: 600
			});
		}
	};
</script>

<div class="relative">
	{#if $showLayerOptionId === layerEntry.id}
		<button
			class="bg-base trans absolute bottom-0 right-0 z-20 rounded-full p-2 text-xs text-white"
			onclick={setEdit}
			>編集
		</button>
	{/if}

	<button
		id={layerEntry.id}
		class="bg-main relative select-none flex-col overflow-clip text-clip text-nowrap rounded-full border-2 border-gray-500 p-2 text-left transition-colors duration-100 {$showLayerOptionId ===
		layerEntry.id
			? 'css-gradient'
			: ' hover:border-accent'}"
		onclick={toggleEdit}
		style:width={$showLayerOptionId === layerEntry.id
			? '100%'
			: layerEntry.style.visible
				? '90%'
				: '70px'}
		style:transition="width 0.3s ease"
	>
		<div class="flex items-center justify-start gap-2">
			<label
				class="relative grid h-[50px] w-[50px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-500"
				onmouseenter={() => (isHovered = true)}
				onmouseleave={() => (isHovered = false)}
			>
				<input
					type="checkbox"
					class="hidden"
					oninput={() => toggleChecked(layerEntry.id)}
					onclick={(event) => event.stopPropagation()}
				/>
				{#if layerEntry.style.visible}
					<LayerIcon {layerEntry} />
				{/if}
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
					<span class="text-nowrap">{layerEntry.metaData.name}</span>

					<span class="text-xs">{layerEntry.metaData.location ?? '---'}</span>
				</div>
			</div>
			<div
				class="absolute bottom-[23px] right-[15px] rounded-full p-[5px] transition-all"
				style="background-color: {colorStyle?.type === 'single'
					? colorStyle.mapping.value
					: 'bg-gray-200'};"
			></div>
		</div>
	</button>
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

	@keyframes gradient {
		0% {
			--angle: 0deg;
		}

		100% {
			--angle: 360deg;
		}
	}

	.css-gradient {
		background: linear-gradient(var(--angle), var(--color1), var(--color2));
		color: white;
		animation: gradient 5s linear infinite;
	}
</style>
