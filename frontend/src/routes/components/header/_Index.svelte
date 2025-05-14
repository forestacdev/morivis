<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, slide, fly } from 'svelte/transition';

	import GeolocateControl from '$routes/components/map-control/GeolocateControl.svelte';
	import StreetViewControl from '$routes/components/map-control/StreetViewControl.svelte';
	import TerrainControl from '$routes/components/map-control/TerrainControl.svelte';
	import Logo from '$routes/components/side-menu/Logo.svelte';
	import {
		showSideMenu,
		showDataMenu,
		mapMode,
		showInfoDialog,
		showTermsDialog,
		showTerrainMenu,
		isSideMenuType
	} from '$routes/store';
	import { tooltip } from '$routes/store/tooltip';
	import { imageExport } from '$routes/utils/map';

	const toggleDataMenu = () => {
		showSideMenu.set(false);
		showDataMenu.set(!$showDataMenu);
	};

	const toggleInfoDialog = () => {
		showSideMenu.set(false);
		showInfoDialog.set(!$showInfoDialog);
	};

	const toggleTermsDialog = () => {
		showSideMenu.set(false);
		showTermsDialog.set(!$showTermsDialog);
	};

	mapMode.subscribe((mode) => {
		showSideMenu.set(false);
	});

	const toggleSearchMenu = () => {
		if ($isSideMenuType === 'search') {
			isSideMenuType.set(null);
		} else {
			isSideMenuType.set('search');
		}
	};

	const toggleLayerMenu = () => {
		if ($isSideMenuType === 'layer') {
			isSideMenuType.set(null);
		} else {
			isSideMenuType.set('layer');
		}
	};

	const toggleDrawMenu = () => {
		if ($isSideMenuType === 'draw') {
			isSideMenuType.set(null);
		} else {
			isSideMenuType.set('draw');
		}
	};
	const toggleTerrainMenu = () => {
		showTerrainMenu.set(!$showTerrainMenu);
	};
</script>

<div class="bg-main/60 absolute left-0 top-0 z-10 flex w-full gap-2 p-1 pl-4 pr-4 text-base">
	<ui>
		{#if $isSideMenuType}
			<button
				class="hover:text-accent pointer-events-auto cursor-pointer p-2 text-left text-base duration-150"
				onclick={() => isSideMenuType.set(null)}
			>
				<Icon icon="ep:back" class="h-8 w-8" />
			</button>
		{:else}
			<button
				class="hover:text-accent pointer-events-auto cursor-pointer p-2 text-left text-base duration-150"
				onclick={() => showSideMenu.set(true)}
			>
				<Icon icon="ic:round-menu" class="h-8 w-8" />
			</button>
		{/if}
	</ui>
	<div class="h-hull w-[1px] rounded-full bg-gray-400"></div>
	<ui class="flex w-full justify-between">
		<li class="flex">
			<button
				onclick={toggleSearchMenu}
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150 {$isSideMenuType ===
				'search'
					? 'text-accent'
					: ''}"
			>
				<Icon icon="stash:search-solid" class="h-8 w-8" />
			</button>
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150 {$isSideMenuType ===
				'layer'
					? 'text-accent'
					: ''}"
				onclick={toggleLayerMenu}
			>
				<Icon icon="ic:round-layers" class="h-8 w-8" />
			</button>
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150 {$isSideMenuType ===
				'draw'
					? 'text-accent'
					: ''}"
				onclick={toggleDrawMenu}
			>
				<Icon icon="fa6-solid:pen" class="h-8 w-8" />
			</button>
		</li>
		<li class="flex">
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150 {$showDataMenu
					? 'text-accent'
					: ''}"
				onclick={toggleDataMenu}
			>
				<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" />
			</button>
			<StreetViewControl />
			<TerrainControl />
			<GeolocateControl />
		</li>
	</ui>
</div>

<style>
	.c-bg-blur {
		backdrop-filter: blur(10px);
	}
</style>
