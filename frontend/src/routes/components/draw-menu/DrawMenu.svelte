<script lang="ts">
	import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw';
	import { fly } from 'svelte/transition';

	import type { GeoDataEntry } from '$routes/data/types';
	import { isSideMenuType } from '$routes/store';
	import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css';

	interface Props {
		layerEntries: GeoDataEntry[];
	}

	let { layerEntries = $bindable() }: Props = $props();
</script>

<!-- レイヤーメニュー -->
{#if $isSideMenuType === 'draw'}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main w-side-menu absolute z-10 flex h-full flex-col gap-2 pt-[70px]"
	>
		<div class="text-white">ddd</div>
		<div
			class="c-fog pointer-events-none absolute bottom-0 z-10 flex h-[100px] w-full items-end justify-center pb-4"
		></div>
	</div>
{/if}

<style>
	.c-fog {
		background: rgb(233, 233, 233);
		background: linear-gradient(0deg, rgb(0, 93, 3) 10%, rgba(233, 233, 233, 0) 100%);
	}
</style>
