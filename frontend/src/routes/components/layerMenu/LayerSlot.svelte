<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { BackgroundLayerSpecification } from 'maplibre-gl';
	import { slide } from 'svelte/transition';
	import { fade } from 'svelte/transition';

	import LayerIcon from '$routes/components/atoms/LayerIcon.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { ColorsExpressions } from '$routes/data/types/vector/style';
	import { addedLayerIds, selectedLayerId, isEdit } from '$routes/store';
	import { showDataMenu } from '$routes/store';
	import { mapStore } from '$routes/store/map';

	interface Props {
		layerEntry: GeoDataEntry;
		tempLayerEntries: GeoDataEntry[];
		toggleVisible?: (id: string) => void;
	}

	let { layerEntry = $bindable(), tempLayerEntries = $bindable(), toggleVisible }: Props = $props();
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

	const selectedLayer = () => {
		if (isHovered || $isEdit) return;
		if ($selectedLayerId === layerEntry.id) {
			selectedLayerId.set('');
		} else {
			selectedLayerId.set(layerEntry.id);
		}
	};

	const toggleChecked = (id: string) => {
		showColors = !showColors;

		toggleVisible(id);
	};

	showDataMenu.subscribe((value) => {
		if (value) {
			$selectedLayerId = '';
		}
	});

	// レイヤーのコピー
	const copyLayer = () => {
		if (!layerEntry) return;
		$isEdit = false;
		const uuid = crypto.randomUUID();
		const copy: GeoDataEntry = JSON.parse(JSON.stringify(layerEntry)); // 深いコピーを作成

		copy.id = uuid;
		copy.metaData.name = `${layerEntry.metaData.name} (コピー)`;

		tempLayerEntries = [...tempLayerEntries, copy];
		addedLayerIds.addLayer(uuid);
	};

	// レイヤーの削除
	const removeLayer = () => {
		$isEdit = false;
		if (!layerEntry) return;
		addedLayerIds.removeLayer(layerEntry.id);
		selectedLayerId.set('');
	};

	// レイヤーの移動
	const moveLayerById = (direction: 'up' | 'down') => {
		if (!layerEntry) return;
		const id = layerEntry.id;
		addedLayerIds.reorderLayer(id, direction);
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
</script>

<div class="relative flex flex-col">
	<button
		id={layerEntry.id}
		class="bg-main c-rounded relative z-10 select-none flex-col overflow-clip text-clip text-nowrap border-2 border-gray-500 p-2 text-left transition-colors duration-100 {$selectedLayerId ===
		layerEntry.id
			? 'css-gradient'
			: ' hover:border-accent'}"
		onclick={selectedLayer}
		style:width={!$showDataMenu ? '100%' : '70px'}
		style:transition="width 0.3s ease"
	>
		<div class="flex items-center justify-start gap-2">
			<div
				class="absolute bottom-[7px] left-[4px] z-10 rounded-full p-[7px] transition-all"
				style="background-color: {colorStyle?.type === 'single'
					? colorStyle.mapping.value
					: 'bg-gray-200'};"
			></div>
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
					<span class="text-nowrap {$selectedLayerId === layerEntry.id ? '' : ''}"
						>{layerEntry.metaData.name}</span
					>

					{#if $selectedLayerId === layerEntry.id}
						<div transition:slide={{ duration: 200 }} id={layerEntry.id} class="">
							<div class="flex gap-2">
								<button class="" onclick={() => moveLayerById('up')}
									><Icon icon="bx:up-arrow" width="20" height="20" class="" />
								</button>
								<button class="" onclick={() => moveLayerById('down')}
									><Icon icon="bx:down-arrow" width="20" height="20" />
								</button>
								<button onclick={removeLayer}>
									<Icon icon="bx:trash" width="20" height="20" class="custom-anime" />
								</button>
								<button onclick={focusLayer}>
									<Icon icon="hugeicons:target-03" width="20" height="20" class="custom-anime" />
								</button>
								<button onclick={copyLayer}>
									<Icon icon="lucide:copy" width="20" height="20" class="custom-anime" />
								</button>
								<button onclick={editLayer}>
									<Icon icon="lucide:edit" width="20" height="20" class="custom-anime" />
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
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

	.css-gradient {
		background: linear-gradient(-90deg, var(--color1), var(--color2));
		color: white;
	}

	.c-rounded {
		border-radius: 9999px 9999px 9999px 9999px;
	}
</style>
