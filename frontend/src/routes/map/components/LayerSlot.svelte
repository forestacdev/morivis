<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { BASEMAP_IMAGE_TILE } from '$map/constants';
	import type { GeoDataEntry } from '$map/data/types';
	import { addedLayerIds, showLayerOptionId, isAnimation } from '$map/store';
	import { getImagePmtiles } from '$map/utils/raster';
	import type { ColorsExpressions } from '$routes/map/data/types/vector/style';

	let { layerEntry = $bindable() }: { layerEntry: GeoDataEntry } = $props();

	const generateIconImage = (_layerEntry: GeoDataEntry) => {
		if (_layerEntry.type !== 'raster') return;
		const tile = _layerEntry.metaData.xyzImageTile
			? _layerEntry.metaData.xyzImageTile
			: BASEMAP_IMAGE_TILE;

		return _layerEntry.format.url
			.replace('{z}', tile.z.toString())
			.replace('{x}', tile.x.toString())
			.replace('{y}', tile.y.toString());
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
		if (isHovered) return;
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
				: BASEMAP_IMAGE_TILE;
			return await getImagePmtiles(_layerEntry.format.url, tile);
		} catch (e) {
			console.error('Error fetching tile image:', e);
		}
	};

	// 非同期関数を初期化時に実行
	const promise = fetchTileImage(layerEntry);

	// コンポーネントがマウントされたら画像を取得
	// fetchTileImage();
</script>

<button
	id={layerEntry.id}
	class="bg-main relative w-full select-none flex-col rounded-full border-2 border-gray-500 p-2 text-left transition-colors duration-100 {$showLayerOptionId ===
	layerEntry.id
		? 'css-gradient'
		: ' hover:border-accent'}"
	class:pointer-events-none={$isAnimation}
	onclick={toggleEdit}
>
	<div class="flex items-center justify-start gap-2">
		<label
			class="relative grid h-[40px] w-[40px] cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-500"
			onmouseenter={() => (isHovered = true)}
			onmouseleave={() => (isHovered = false)}
		>
			<input
				type="checkbox"
				class="hidden"
				bind:checked={layerEntry.style.visible}
				onclick={(event) => event.stopPropagation()}
			/>
			{#if layerEntry.style.visible}
				{#if layerEntry.type === 'raster'}
					{#if layerEntry.format.type === 'image'}
						<img
							transition:fade
							class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
							alt={layerEntry.metaData.name}
							src={generateIconImage(layerEntry)}
						/>
					{:else if layerEntry.format.type === 'pmtiles'}
						{#await promise then url}
							<img
								transition:fade
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
			<span>{layerEntry.metaData.name}</span>
			<div class="flex items-center gap-2 text-xs">
				<span class="">{layerEntry.metaData.location ?? '---'}</span>
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
