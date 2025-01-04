<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { BASEMAP_IMAGE_TILE } from '$map/constants';
	import type { GeoDataEntry } from '$map/data/types';
	import { addedLayerIds, showLayerOptionId } from '$map/store';
	import type { ColorsExpressions } from '$routes/map/data/types/vector/style';

	let { layerEntry = $bindable() }: { layerEntry: GeoDataEntry } = $props();

	const generateIconImage = (_xyzImageTile: { x: number; y: number; z: number } | null) => {
		if (!_xyzImageTile) {
			return layerEntry.format.url
				.replace('{z}', BASEMAP_IMAGE_TILE.Z.toString())
				.replace('{x}', BASEMAP_IMAGE_TILE.X.toString())
				.replace('{y}', BASEMAP_IMAGE_TILE.Y.toString());
		}
		return layerEntry.format.url
			.replace('{z}', _xyzImageTile.z.toString())
			.replace('{x}', _xyzImageTile.x.toString())
			.replace('{y}', _xyzImageTile.y.toString());
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
</script>

<button
	id={layerEntry.id}
	class="bg-main relative w-full select-none flex-col rounded-full border-2 border-gray-500 p-2 text-left transition-colors duration-100 {$showLayerOptionId ===
	layerEntry.id
		? 'css-gradient'
		: ' hover:border-accent'}"
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
					<img
						transition:fade
						class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
						alt={layerEntry.metaData.name}
						src={generateIconImage(layerEntry.metaData.xyzImageTile)}
					/>
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
