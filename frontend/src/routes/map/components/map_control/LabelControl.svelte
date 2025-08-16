<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import { selectedBaseMap, showLabelLayer } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';
	import { isBBoxInside } from '$routes/map/utils/map';
	import type { LngLatBoundsLike } from 'maplibre-gl';
	import type { BaseMapType } from '$routes/stores/layers';

	const toggleLayer = () => {
		showLabelLayer.set(!$showLabelLayer);
	};

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
		}
	]);

	const xyz = { x: 28846, y: 12917, z: 15 };
</script>

<button
	bind:this={containerRef}
	onclick={() => {
		showMenu = !showMenu;
	}}
	class="pointer-events-auto grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg"
>
	<Icon icon="hugeicons:layer" class="h-8 w-8 {$showLabelLayer ? 'text-accent' : 'text-base'}" />
</button>

{#if showMenu}
	<div
		class="bg-base absolute right-[200px] top-[60px] z-10 flex flex-col rounded-lg p-2 shadow-lg"
	>
		<div class="">
			<div>背景地図</div>
			<div class="flex gap-4">
				{#each baseMapList as baseMap}
					<button
						onclick={() => {
							if ($selectedBaseMap === baseMap.type) return;
							$selectedBaseMap = baseMap.type;
						}}
						class="flex cursor-pointer flex-col items-center justify-start gap-2 rounded-md border-2 p-2 transition-colors duration-150 hover:bg-gray-100 {$selectedBaseMap ===
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
							class="h-16 w-16 rounded-lg"
						/>
						<span class="text-xs"> {baseMap.label}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
</style>
