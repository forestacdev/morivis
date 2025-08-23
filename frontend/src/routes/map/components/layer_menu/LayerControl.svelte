<script lang="ts">
	import TerrainControl from '$routes/map/components/map_control/TerrainControl.svelte';
	import GeolocateControl from '$routes/map/components/map_control/GeolocateControl.svelte';
	import Checkbox from './Checkbox.svelte';

	import {
		selectedBaseMap,
		showLabelLayer,
		showXYZTileLayer,
		showRoadLayer,
		showBoundaryLayer,
		showPoiLayer
	} from '$routes/stores/layers';

	import StreetViewControl from '../map_control/StreetViewControl.svelte';
	import { fly } from 'svelte/transition';

	import type { BaseMapType } from '$routes/stores/layers';
	import { baseMapList } from '$routes/map/utils/layers/base_map';

	let showMenu = $state<boolean>(false);

	let containerRef = $state<HTMLElement>();

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showMenu && containerRef && !containerRef.contains(event.target as Node)) {
				showMenu = false;
			}
		};

		if (showMenu) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	let isOsm = $derived.by(() => {
		return $selectedBaseMap === 'osm';
	});
</script>

<div bind:this={containerRef} class="relative">
	<div class="flex items-center justify-between rounded-lg bg-black p-1">
		<button
			onclick={() => {
				showMenu = !showMenu;
			}}
			class="pointer-events-auto grid shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg"
		>
			<img
				src={baseMapList.find((map) => map.type === $selectedBaseMap)?.src}
				alt="ベースマップ"
				class="c-no-drag-icon h-14 w-14 rounded-lg"
			/>
		</button>
		<div class="flex items-center">
			<TerrainControl />
			<GeolocateControl />
			<StreetViewControl />
		</div>
	</div>

	{#if showMenu}
		<div
			transition:fly={{ duration: 200, y: 50, opacity: 0 }}
			class="bg-sub absolute bottom-[100px] z-10 flex w-full flex-col gap-4 rounded-lg p-2 text-base shadow-lg"
		>
			<div class="flex flex-col gap-2">
				<div>レイヤ</div>

				<div class="ml-6 grid w-full grid-cols-2 items-center justify-center gap-y-4">
					<Checkbox label="アカデミー施設等" bind:value={$showPoiLayer} />
					<Checkbox label="境界線" bind:value={$showBoundaryLayer} disabled={isOsm} />
					<Checkbox label="地名等" bind:value={$showLabelLayer} disabled={isOsm} />
					<Checkbox label="道路" bind:value={$showRoadLayer} disabled={isOsm} />
					{#if import.meta.env.DEV}
						<Checkbox label="タイル座標" bind:value={$showXYZTileLayer} />
					{/if}
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<div>ベースマップ</div>
				<div class="flex w-full items-center justify-center gap-4">
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
								src={baseMap.src}
								alt={baseMap.label}
								class="c-no-drag-icon h-16 w-16 rounded-lg"
							/>
							<span class="text-xs"> {baseMap.label}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
</style>
