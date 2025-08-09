<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';

	import FacLogo from '$lib/components/svgs/FacLogo.svelte';
	import { mapMode, isDebugMode } from '$routes/stores';
	import { showOtherMenu, showDataMenu, showInfoDialog, showTermsDialog } from '$routes/stores/ui';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';
	import { imageExport, exportPDF } from '$routes/map/utils/map';
	import { goto } from '$app/navigation';
	import Switch from '$routes/map/components/atoms/Switch.svelte';

	import { isBlocked } from '$routes/stores/ui';
	import { checkPc } from '../utils/ui';

	const toggleDataMenu = () => {
		showOtherMenu.set(false);
		showDataMenu.set(!$showDataMenu);
	};

	const toggleInfoDialog = () => {
		showOtherMenu.set(false);
		showInfoDialog.set(!$showInfoDialog);
	};

	const toggleTermsDialog = () => {
		showOtherMenu.set(false);
		showTermsDialog.set(!$showTermsDialog);
	};

	const mapExport = async () => {
		showOtherMenu.set(false);
		isProcessing.set(true);
		const map = mapStore.getMap();
		if (!map) return;
		await imageExport(map);
		isProcessing.set(false);
		showNotification('地図をPNG画像でエクスポートしました', 'success');
	};

	const goHome = async () => {
		showOtherMenu.set(false);
		if (import.meta.env.MODE === 'production') {
			goto('/morivis');
		} else {
			goto('/');
		}
	};
	mapMode.subscribe((mode) => {
		showOtherMenu.set(false);
	});
</script>

{#if $showOtherMenu}
	<!-- 背景のオーバーレイ -->
	<div
		transition:fade={{ duration: 300 }}
		class="absolute left-0 top-0 z-30 h-full w-full bg-black/50 max-lg:hidden"
		role="button"
		tabindex="0"
		onclick={() => showOtherMenu.set(false)}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				showOtherMenu.set(false);
			}
		}}
	></div>

	<!-- メニュー本体 -->
	<div
		transition:fly={{ duration: checkPc() ? 300 : 0, x: checkPc() ? 100 : 0, opacity: 0 }}
		class="bg-main absolute right-0 top-0 flex h-full flex-col gap-2 p-2 text-base max-lg:w-full lg:z-30 lg:w-[400px]"
	>
		<div class="flex items-center justify-between">
			<div class="w-full p-4 [&_path]:fill-white">
				<FacLogo width={'250px'} />
			</div>
			<button
				onclick={() => showOtherMenu.set(false)}
				class="bg-base cursor-pointer rounded-full p-2 max-lg:hidden"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-4 w-4" />
			</button>
		</div>
		<ui>
			<!-- <button
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
			</button> -->

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
		<div class="w-hull bg-base h-[1px] rounded-full opacity-60"></div>
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
				href="https://github.com/forestacdev/morivis"
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

			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				onclick={goHome}
				disabled={$isBlocked}
				><Icon icon="heroicons:power-16-solid" class="h-8 w-8" />
				<span>トップページへ</span></button
			>
			{#if import.meta.env.MODE === 'development'}
				{#if import.meta.env.MODE === 'development'}
					<Switch label="デバッグモード" bind:value={$isDebugMode} />
				{/if}
			{/if}
		</ui>
		<ui class="mt-auto text-end"> Ver. 0.1.0 beta </ui>
	</div>
{/if}

<style>
</style>
