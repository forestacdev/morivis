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

<div class="bg-main absolute left-2 top-2 z-10 flex flex-col gap-2 rounded-full p-2 text-base">
	<ui>
		<button
			class="bg-main pointer-events-auto rounded-full p-2 text-left text-base"
			onclick={() => showSideMenu.set(true)}
		>
			<Icon icon="ic:round-menu" class="h-8 w-8" />
		</button>
	</ui>
	<div class="w-hull bg-base h-[1px] rounded-full"></div>
	<ui>
		<button
			onclick={toggleSearchMenu}
			class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
		>
			<Icon icon="stash:search-solid" class="h-8 w-8" />
		</button>
		<button
			class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
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
			class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
			onclick={toggleDataMenu}
		>
			<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" />
		</button>
		<button
			class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
			onclick={toggleTerrainMenu}
		>
			<Icon icon="ic:round-terrain" class="h-8 w-8" />
		</button>
		<!-- <button
			class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
		>
			<Icon icon="weui:setting-filled" class="h-8 w-8" />
		</button> -->
	</ui>
</div>

<style>
</style>
