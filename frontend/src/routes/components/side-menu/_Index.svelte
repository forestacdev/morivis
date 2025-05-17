<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';

	import Logo from '$routes/components/side-menu/Logo.svelte';
	import {
		showSideMenu,
		showDataMenu,
		mapMode,
		showInfoDialog,
		showTermsDialog
	} from '$routes/store';
	import { isSideMenuType } from '$routes/store/ui';

	import { mapStore } from '$routes/store/map';
	import { showNotification } from '$routes/store/notification';
	import { isProcessing } from '$routes/store/ui';
	import { imageExport, exportPDF } from '$routes/utils/map';

	const toggleLayerMenu = () => {
		showSideMenu.set(false);
		isSideMenuType.set('layer');
	};

	const togleSearchMenu = () => {
		showSideMenu.set(false);
		isSideMenuType.set('search');
	};

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

	const mapExport = async () => {
		showSideMenu.set(false);
		isProcessing.set(true);
		const map = mapStore.getMap();
		if (!map) return;
		await imageExport(map);
		isProcessing.set(false);
		showNotification('地図を.pngでエクスポートしました', 'success');
	};
	mapMode.subscribe((mode) => {
		showSideMenu.set(false);
	});
</script>

{#if $showSideMenu}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute left-0 top-0 z-30 h-full w-full bg-black/50"
		role="button"
		tabindex="0"
		onclick={() => showSideMenu.set(false)}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				showSideMenu.set(false);
			}
		}}
	></div>
	<div
		transition:fly={{ duration: 200, x: -100, opacity: 0 }}
		class="bg-main absolute left-0 top-0 z-30 flex h-full w-[400px] flex-col gap-2 p-2 text-base"
	>
		<div class="flex items-center justify-between">
			<Logo />
			<button
				onclick={() => showSideMenu.set(false)}
				class="bg-base cursor-pointer rounded-full p-2"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-4 w-4" />
			</button>
		</div>
		<ui>
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				onclick={togleSearchMenu}
			>
				<Icon icon="stash:search-solid" class="h-8 w-8" />
				<span class="select-none">検索</span>
			</button>
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				onclick={toggleLayerMenu}
			>
				<Icon icon="ic:round-layers" class="h-8 w-8" />
				<span class="select-none">レイヤー</span>
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
				<span class="select-none">データカタログ</span>
			</button>
			<!-- <button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
			>
				<Icon icon="weui:setting-filled" class="h-8 w-8" />
				<span class="select-none">設定</span>
			</button> -->
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				onclick={mapExport}
			>
				<Icon icon="bx:export" class="h-8 w-8" />
				<span class="select-none">地図をエクスポート</span>
			</button>
		</ui>
		<div class="w-hull bg-base h-[1px] rounded-full"></div>
		<ui>
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				onclick={toggleTermsDialog}
			>
				<Icon icon="majesticons:note-text" class="h-8 w-8" />
				<span class="select-none">利用規約</span>
			</button>
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				onclick={toggleInfoDialog}
			>
				<Icon icon="akar-icons:info-fill" class="h-8 w-8" />
				<span class="select-none">このアプリについて</span>
			</button>
			<a
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				href="https://github.com/forestacdev/enshurin-viewer"
				target="_blank"
				rel="noopener noreferrer"
				><Icon icon="mdi:github" class="h-8 w-8" />
				<span>GitHub</span></a
			>

			<a
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				href="https://www.forest.ac.jp/"
				target="_blank"
				rel="noopener noreferrer"
				><Icon icon="mdi:web" class="h-8 w-8" />
				<span>森林文化アカデミーHP</span></a
			>
		</ui>
		<ui class="mt-auto"> Ver. 0.1.0 beta </ui>
	</div>
{/if}

<style>
</style>
