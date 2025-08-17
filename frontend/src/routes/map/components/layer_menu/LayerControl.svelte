<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import TerrainControl from '$routes/map/components/map_control/TerrainControl.svelte';
	import GeolocateControl from '$routes/map/components/map_control/GeolocateControl.svelte';

	import Switch from '$routes/map/components/atoms/Switch.svelte';

	import {
		selectedBaseMap,
		showLabelLayer,
		showXYZTileLayer,
		showRoadLayer
	} from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';

	import type { LngLatBoundsLike } from 'maplibre-gl';
	import StreetViewControl from '../map_control/StreetViewControl.svelte';
	import { isDebugMode } from '$routes/stores';
	import { fly } from 'svelte/transition';
	import { isBBoxInside } from '$routes/map/utils/map';

	import type { BaseMapType } from '$routes/stores/layers';

	const toggleLayer = () => {
		showLabelLayer.set(!$showLabelLayer);
	};

	type MenuType = 'baseMap' | 'layer' | null;

	let showMenuType = $state<MenuType>(null);

	let containerRef = $state<HTMLElement>();

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showMenuType && containerRef && !containerRef.contains(event.target as Node)) {
				showMenuType = null;
			}
		};

		if (showMenuType) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	const baseMapList = $state.raw<
		{
			type: BaseMapType;
			label: string;
			src: string;
		}[]
	>([
		{
			type: 'satellite',
			label: '航空写真',
			src: 'https://cyberjapandata.gsi.go.jp/xyz/nendophoto2018/{z}/{x}/{y}.png'
		},
		{
			type: 'hillshade',
			label: '地形図',
			src: 'https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'
		},
		{
			type: 'osm',
			label: 'OpenStreetMap',
			src: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
		}
	]);

	const xyz = { x: 28846, y: 12917, z: 15 };
</script>

<div bind:this={containerRef} class="relative">
	<div class="flex items-center justify-between rounded-lg bg-black p-2">
		<button
			onclick={() => {
				showMenuType = showMenuType === 'baseMap' ? null : 'baseMap';
			}}
			class="pointer-events-auto grid shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg"
		>
			<img
				src={baseMapList
					.find((map) => map.type === $selectedBaseMap)
					?.src.replace('{x}', String(xyz.x))
					.replace('{y}', String(xyz.y))
					.replace('{z}', String(xyz.z))}
				alt="背景地図"
				class="c-no-drag-icon h-14 w-14 rounded-lg"
			/>
		</button>
		<div class="flex items-center">
			<TerrainControl />
			<GeolocateControl />

			<StreetViewControl />
		</div>
	</div>

	{#if showMenuType}
		<div
			transition:fly={{ duration: 200, y: 50, opacity: 0 }}
			class="bg-sub absolute bottom-[100px] z-10 flex w-full flex-col rounded-lg p-2 text-base shadow-lg"
		>
			{#if showMenuType === 'baseMap'}
				<div>
					<div>レイヤ</div>
					<div class="flex w-full flex-col">
						{#if import.meta.env.DEV}
							<Switch label="地名等" bind:value={$showLabelLayer} />
							<Switch label="道路" bind:value={$showRoadLayer} />
							<Switch label="タイル座標" bind:value={$showXYZTileLayer} />
						{/if}
					</div>
				</div>
				<div class="">
					<div>背景地図</div>
					<div class="flex gap-4">
						{#each baseMapList as baseMap}
							<button
								onclick={() => {
									if ($selectedBaseMap === baseMap.type) return;
									$selectedBaseMap = baseMap.type;
								}}
								class="flex cursor-pointer select-none flex-col items-center justify-start gap-2 rounded-md border-2 p-2 transition-colors duration-150 {$selectedBaseMap ===
								baseMap.type
									? 'border-accent'
									: 'border-transparent'}"
							>
								<img
									src={baseMap.src
										.replace('{x}', String(xyz.x))
										.replace('{y}', String(xyz.y))
										.replace('{z}', String(xyz.z))}
									alt={baseMap.label}
									class="c-no-drag-icon h-16 w-16 rounded-lg"
								/>
								<span class="text-xs"> {baseMap.label}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
</style>
