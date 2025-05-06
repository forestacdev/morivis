<script lang="ts">
	import Icon from '@iconify/svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import Logo from '$routes/components/side-menu/Logo.svelte';
	import {
		showSideMenu,
		showDataMenu,
		mapMode,
		showInfoDialog,
		showTermsDialog,
		showSearchMenu,
		showTerrainMenu
	} from '$routes/store';
	import { mapStore } from '$routes/store/map';
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
		showSearchMenu.set(!$showSearchMenu);
	};

	const toggleTerrainMenu = () => {
		showTerrainMenu.set(!$showTerrainMenu);
	};
</script>

<div class="bg-main absolute left-0 top-2 z-10 flex gap-2 rounded-r-full p-1 pl-4 pr-4 text-base">
	<ui>
		<button
			class="hover:text-accent bg-main pointer-events-auto cursor-pointer rounded-full p-2 text-left text-base duration-150"
			onclick={() => showSideMenu.set(true)}
		>
			<Icon icon="ic:round-menu" class="h-8 w-8" />
		</button>
	</ui>
	<div class="h-hull w-[1px] rounded-full bg-gray-400"></div>
	<ui class="flex">
		<button
			onclick={toggleSearchMenu}
			class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
		>
			<Icon icon="stash:search-solid" class="h-8 w-8" />
		</button>
		<button
			class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
			onclick={() => mapMode.set('edit')}
		>
			<Icon icon="ic:round-layers" class="h-8 w-8" />
		</button>
		<!-- <button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				onclick={() => mapMode.set('analysis')}
			>
				<Icon icon="streamline:code-analysis-solid" class="h-8 w-8" />
				<span class="select-none">地図の解析</span>
			</button> -->
		<button
			class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
			onclick={toggleDataMenu}
		>
			<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" />
		</button>
		<!-- <button
			class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
			onclick={toggleTerrainMenu}
		>
			<Icon icon="ic:round-terrain" class="h-8 w-8" />
		</button> -->
		<!-- <button
			class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
		>
			<Icon icon="weui:setting-filled" class="h-8 w-8" />
		</button> -->
	</ui>
</div>

<style>
</style>
