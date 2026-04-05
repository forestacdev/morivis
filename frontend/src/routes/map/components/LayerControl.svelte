<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fly } from 'svelte/transition';

	import Checkbox from './layer_menu/Checkbox.svelte';

	import { baseMapList } from '$routes/map/utils/layers/base_map';
	import {
		selectedBaseMap,
		showLabelLayer,
		showHillshadeLayer,
		showXYZTileLayer,
		showRoadLayer,
		showBoundaryLayer,
		showPoiLayer,
		showStreetViewLayer,
		showCloudLayer
	} from '$routes/stores/layers';
	import { mapStore, isTerrain3d } from '$routes/stores/map';
	import { isMobile } from '$routes/stores/ui';

	isTerrain3d.subscribe((is3d) => {
		mapStore.toggleTerrain(is3d);
	});

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

	let isNotSatellite = $derived.by(() => {
		return $selectedBaseMap !== 'satellite';
	});

	let isNotHillshade = $derived.by(() => {
		return (
			$selectedBaseMap === 'satellite' ||
			$selectedBaseMap === 'slope' ||
			$selectedBaseMap === 'aspect'
		);
	});
</script>

<div bind:this={containerRef} class="pointer-events-auto max-lg:w-full lg:hidden">
	{#if showMenu}
		<div
			transition:fly={{ duration: 200, y: 50, opacity: 0 }}
			class="bg-main absolute flex w-full flex-col gap-4 rounded-lg p-2 text-base shadow-lg max-lg:bottom-0 max-lg:z-30 lg:bottom-[80px] lg:z-10"
		>
			<div class="flex flex-col gap-2">
				<div class="flex w-full justify-between">
					<span>レイヤ</span>
					<button onclick={() => (showMenu = false)} class="cursor-pointer text-base">
						<Icon icon="material-symbols:close-rounded" class="h-6 w-6" />
					</button>
				</div>

				<div class="ml-6 grid w-full grid-cols-2 items-center justify-center gap-y-4">
					<Checkbox label="アカデミー施設等" bind:value={$showPoiLayer} />
					<Checkbox label="境界線" bind:value={$showBoundaryLayer} disabled={isOsm} />
					<Checkbox label="地名等" bind:value={$showLabelLayer} disabled={isOsm} />
					<Checkbox label="道路・線路" bind:value={$showRoadLayer} disabled={isOsm} />
					<Checkbox label="陰影" bind:value={$showHillshadeLayer} disabled={isNotHillshade} />
					<Checkbox label="3D地形" bind:value={$isTerrain3d} />
					<Checkbox label="雲" bind:value={$showCloudLayer} disabled={isNotSatellite} />
					{#if $isMobile}
						<Checkbox label="ストリートビュー" bind:value={$showStreetViewLayer} />
					{/if}

					{#if import.meta.env.DEV}
						<Checkbox label="タイル座標" bind:value={$showXYZTileLayer} />
					{/if}
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<div>ベースマップ</div>
				<div class="grid w-full grid-cols-3 items-center justify-center gap-x-2">
					{#each baseMapList as baseMap}
						<button
							onclick={() => {
								if ($selectedBaseMap === baseMap.type) return;
								$selectedBaseMap = baseMap.type;
							}}
							class="flex cursor-pointer flex-col items-center justify-start gap-2 rounded-md border-2 p-2 transition-colors duration-150 select-none {$selectedBaseMap ===
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

	<button
		onclick={() => {
			showMenu = !showMenu;
		}}
		class="bg-base pointer-events-auto grid shrink-0 place-items-center items-center justify-end rounded-lg p-1 shadow-md max-lg:m-3 lg:absolute lg:bottom-0 lg:left-0 lg:cursor-pointer"
		style="margin-top: calc(16px + env(safe-area-inset-top));"
	>
		<img
			src={baseMapList.find((map) => map.type === $selectedBaseMap)?.src}
			alt="ベースマップ"
			class="c-no-drag-icon h-14 w-14 rounded-lg"
		/>
	</button>
</div>

<style>
</style>
