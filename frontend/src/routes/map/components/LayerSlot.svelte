<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { IMAGE_TILE_XYZ } from '$map/constants';
	import type { GeoDataEntry } from '$map/data/types';
	import { addedLayerIds, showLayerOptionId, isAnimation, isEdit } from '$map/store';
	import { mapStore } from '$map/store/map';
	import { getImagePmtiles } from '$map/utils/raster';
	import type { ColorsExpressions } from '$map/data/types/vector/style';

	// TODO エラー チェックをすると発生
	let { layerEntry = $bindable(), toggleVisible }: { layerEntry: GeoDataEntry } = $props();
	let showColors = $state(false);

	const generateIconImage = async (_layerEntry: GeoDataEntry): Promise<string | undefined> => {
		if (_layerEntry.type !== 'raster') {
			// raster タイプ以外の場合は undefined を返す
			return Promise.resolve(undefined);
		}
		// xyz タイル情報を取得
		const tile = _layerEntry.metaData.xyzImageTile
			? _layerEntry.metaData.xyzImageTile
			: IMAGE_TILE_XYZ;

		// URLを生成して Promise として返す
		return Promise.resolve(
			_layerEntry.format.url
				.replace('{z}', tile.z.toString())
				.replace('{x}', tile.x.toString())
				.replace('{y}', tile.y.toString())
		);
	};

	const getColorPallet = (ColorsExpressions: ColorsExpressions[]) => {
		if (!layerEntry) return;
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
		}
	};

	// 非同期で画像URLを取得
	const fetchTileImage = async (_layerEntry: GeoDataEntry) => {
		try {
			if (_layerEntry.type !== 'raster' || _layerEntry.format.type !== 'pmtiles') return;
			const tile = _layerEntry.metaData.xyzImageTile
				? _layerEntry.metaData.xyzImageTile
				: IMAGE_TILE_XYZ;
			return await getImagePmtiles(_layerEntry.format.url, tile);
		} catch (e) {
			console.error('Error fetching tile image:', e);
		}
	};

	// 非同期関数を初期化時に実行
	const promise = (() => {
		if (layerEntry.type === 'raster') {
			if (layerEntry.format.type === 'image') {
				return generateIconImage(layerEntry);
			} else if (layerEntry.format.type === 'pmtiles') {
				return fetchTileImage(layerEntry);
			}
		}
	})();

	const toggleChecked = (id: string) => {
		showColors = !showColors;
		toggleVisible(id);
	};
</script>

<div class="relative">
	{#if $showLayerOptionId === layerEntry.id}
		<button
			class="bg-base trans absolute bottom-0 right-0 z-20 rounded-full p-2 text-xs text-white"
			onclick={() => ($isEdit = !$isEdit)}
			>編集
		</button>
	{/if}

	<button
		id={layerEntry.id}
		class="bg-main relative select-none flex-col overflow-clip text-clip text-nowrap rounded-full border-2 border-gray-500 p-2 text-left transition-colors duration-100 {$showLayerOptionId ===
		layerEntry.id
			? 'css-gradient'
			: ' hover:border-accent'}"
		class:pointer-events-none={$isAnimation}
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
					{#if layerEntry.type === 'raster'}
						{#if layerEntry.format.type === 'image'}
							{#await promise then url}
								<img
									transition:fade
									class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
									crossOrigin="anonymous"
									alt={layerEntry.metaData.name}
									src={url}
								/>
							{/await}
						{:else if layerEntry.format.type === 'pmtiles'}
							{#await promise then url}
								<img
									transition:fade
									crossOrigin="anonymous"
									class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
									alt={layerEntry.metaData.name}
									src={url}
								/>
							{/await}
						{/if}
					{:else if layerEntry.type === 'vector'}
						<div transition:fade={{ duration: 100 }} class="pointer-events-none absolute">
							{#if layerEntry.format.geometryType === 'Point'}
								<Icon icon="ic:baseline-mode-standby" class="pointer-events-none" width={30} />
							{:else if layerEntry.format.geometryType === 'LineString'}
								<Icon icon="ic:baseline-polymer" class="pointer-events-none" width={30} />
							{:else if layerEntry.format.geometryType === 'Polygon'}
								<Icon icon="ic:baseline-pentagon" class="pointer-events-none" width={30} />
							{/if}
						</div>
					{/if}
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
