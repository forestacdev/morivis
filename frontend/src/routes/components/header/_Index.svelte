<script lang="ts">
	import Icon from '@iconify/svelte';

	import GeolocateControl from '$routes/components/map-control/GeolocateControl.svelte';
	import StreetViewControl from '$routes/components/map-control/StreetViewControl.svelte';
	import TerrainControl from '$routes/components/map-control/TerrainControl.svelte';
	import {
		showSideMenu,
		showDataMenu,
		mapMode,
		showInfoDialog,
		showTermsDialog,
		showTerrainMenu
	} from '$routes/store';
	import { isSideMenuType } from '$routes/store/ui';
	import { slide } from 'svelte/transition';

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

<div
	class="pointer-events-none absolute left-0 top-0 z-10 flex w-full justify-between gap-2 p-2 text-base"
>
	<div
		class="flex justify-between rounded-full p-1 transition-all duration-150 {$isSideMenuType
			? 'bg-base text-main pr-1'
			: 'bg-main pr-2 text-white'}"
	>
		<div class="relative">
			<button
				class="hover:text-accent pointer-events-auto cursor-pointer p-2 text-left duration-150"
				onclick={() => showSideMenu.set(true)}
			>
				<Icon icon="ic:round-menu" class="h-7 w-7" />
			</button>
		</div>
		<div class="h-hull w-[1px] rounded-full bg-gray-400"></div>

		<div class="flex w-full items-center justify-between">
			<button
				onclick={toggleSearchMenu}
				class="hover:text-accent transition-text pointer-events-auto flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150 {$isSideMenuType ===
				'search'
					? 'text-accent scale-120'
					: ''}"
			>
				<Icon icon="stash:search-solid" class="h-7 w-7" />
			</button>
			{#if $isSideMenuType === 'search'}
				<div
					transition:slide={{ duration: 300, axis: 'x' }}
					class="w-[120px] shrink-0 text-nowrap text-center text-lg"
				>
					検索
				</div>
			{/if}
			<button
				class="hover:text-accent transition-text pointer-events-auto flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150 {$isSideMenuType ===
				'layer'
					? 'text-accent scale-120'
					: ''}"
				onclick={toggleLayerMenu}
			>
				<Icon icon="ic:round-layers" class="h-7 w-7" />
			</button>
			{#if $isSideMenuType === 'layer'}
				<div
					transition:slide={{ duration: 300, axis: 'x' }}
					class="w-[120px] shrink-0 text-nowrap text-center text-lg"
				>
					レイヤー
				</div>
			{/if}
			<button
				class="hover:text-accent pointer-events-auto flex w-full cursor-pointer items-center justify-start gap-2 p-2 transition-all duration-150 {$isSideMenuType ===
				'draw'
					? 'text-accent scale-120'
					: ''}"
				onclick={toggleDrawMenu}
			>
				<Icon icon="fa6-solid:pen" class="h-5 w-5" />
			</button>
			{#if $isSideMenuType === 'draw'}
				<div
					transition:slide={{ duration: 300, axis: 'x' }}
					class="w-[120px] shrink-0 text-nowrap text-center text-lg"
				>
					描画ツール
				</div>
			{/if}
		</div>
		{#if $isSideMenuType}
			<button
				class="hover:text-accent pointer-events-auto cursor-pointer p-2 text-left duration-150"
				onclick={() => isSideMenuType.set(null)}
			>
				<Icon icon="material-symbols:close-rounded" class="h-7 w-7" />
			</button>
		{/if}
	</div>
	<li class="flex">
		<button
			class="pointer-events-auto grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center p-2 {$showDataMenu
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
</div>

<style>
	.c-bg-blur {
		backdrop-filter: blur(10px);
	}
</style>
