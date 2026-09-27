<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import { goto } from '$app/navigation';
	import FacLogo from '$lib/components/svgs/FacLogo.svelte';
	import AkarIconsInfoFillIcon from '$lib/components/svgs/icons/akar-icons/InfoFillIcon.svelte';
	import BxExportIcon from '$lib/components/svgs/icons/bx/ExportIcon.svelte';
	import GrommetIconsInstallOptionIcon from '$lib/components/svgs/icons/grommet-icons/InstallOptionIcon.svelte';
	import HeroiconsPower16SolidIcon from '$lib/components/svgs/icons/heroicons/Power16SolidIcon.svelte';
	import MajesticonsNoteTextIcon from '$lib/components/svgs/icons/majesticons/NoteTextIcon.svelte';
	import MaterialSymbolsCloseRoundedIcon from '$lib/components/svgs/icons/material-symbols/CloseRoundedIcon.svelte';
	import MaterialSymbolsCodeRoundedIcon from '$lib/components/svgs/icons/material-symbols/CodeRoundedIcon.svelte';
	import MaterialSymbolsDataSaverOnRoundedIcon from '$lib/components/svgs/icons/material-symbols/DataSaverOnRoundedIcon.svelte';
	import MdiGithubIcon from '$lib/components/svgs/icons/mdi/GithubIcon.svelte';
	import MdiWebIcon from '$lib/components/svgs/icons/mdi/WebIcon.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import { imageExport, getMapCanvasImage } from '$routes/map/utils/formats/export/image';
	import {
		checkPWA,
		deferredPromptAvailable,
		pwaInstall,
		shouldShowInstallButton
	} from '$routes/map/utils/platform/pwa';
	import { checkPc } from '$routes/map/utils/platform/viewport';
	import { mapMode, isDebugMode, isStreetView } from '$routes/stores';
	import { showXYZTileLayer } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';
	import {
		showOtherMenu,
		showDataMenu,
		showInfoDialog,
		showTermsDialog,
		isMobile
	} from '$routes/stores/ui';
	import { isProcessing } from '$routes/stores/ui';
	import { isBlocked } from '$routes/stores/ui';
	interface Props {
		imagePreviewUrl: string | null;
		imageBounds: [number, number, number, number] | null;
	}

	let { imagePreviewUrl = $bindable(), imageBounds = $bindable() }: Props = $props();

	const toggleDataMenu = () => {
		showOtherMenu.set(false);
		showDataMenu.set(!$showDataMenu);
	};

	const toggleInfoDialog = () => {
		if (checkPc()) showOtherMenu.set(false);
		showInfoDialog.set(!$showInfoDialog);
	};

	const toggleTermsDialog = () => {
		if (checkPc()) showOtherMenu.set(false);
		showTermsDialog.set(!$showTermsDialog);
	};

	const mapExport = async () => {
		showOtherMenu.set(false);

		const map = mapStore.getMap();
		if (!map) return;
		const result = await getMapCanvasImage(map);
		imagePreviewUrl = result.imageUrl;
		imageBounds = result.bounds;

		// showNotification('地図をPNG画像でエクスポートしました', 'success');
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

	const canShowInstallButton = $derived(
		$isMobile && ($deferredPromptAvailable || shouldShowInstallButton())
	);
</script>

{#if $showOtherMenu}
	<!-- 背景のオーバーレイ -->
	<div
		transition:fade={{ duration: 300 }}
		class="absolute top-0 left-0 z-30 h-full w-full bg-black/50 max-lg:hidden backdrop-blur-[3px]"
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
		transition:fly={{ duration: 300, x: !$isMobile ? 100 : 0, opacity: 0 }}
		class="bg-main absolute top-0 right-0 flex h-full flex-col gap-2 p-2 text-base max-lg:w-full lg:z-30 lg:w-[400px]"
		style="padding-top: env(safe-area-inset-top);"
	>
		<div class="flex items-center justify-between">
			<div class="w-full p-4 [&_path]:fill-white">
				<FacLogo width={'250px'} />
			</div>
			<button
				onclick={() => showOtherMenu.set(false)}
				class="bg-base cursor-pointer rounded-full p-2 max-lg:hidden"
			>
				<MaterialSymbolsCloseRoundedIcon class="text-main h-4 w-4" />
			</button>
		</div>
		{#if !$isStreetView}
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
					class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150 max-lg:hidden"
					onclick={toggleDataMenu}
				>
					<MaterialSymbolsDataSaverOnRoundedIcon class="h-8 w-8" />
					<span class="select-none">データカタログ</span>
				</button>
				<!-- <button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
			>
				<Icon icon="weui:setting-filled" class="h-8 w-8" />
				<span class="select-none">設定</span>
			</button> -->
				<button
					class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150 max-lg:hidden"
					onclick={mapExport}
				>
					<BxExportIcon class="h-8 w-8" />
					<span class="select-none">地図をエクスポート</span>
				</button>
			</ui>
			<div class="w-hull bg-base h-[1px] rounded-full opacity-60"></div>
		{/if}
		<ui>
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				onclick={toggleInfoDialog}
			>
				<AkarIconsInfoFillIcon class="h-8 w-8" />
				<span class="select-none">このアプリについて</span>
			</button>
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				onclick={toggleTermsDialog}
			>
				<MajesticonsNoteTextIcon class="h-8 w-8" />
				<span class="select-none">利用規約</span>
			</button>

			<a
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				href="https://github.com/forestacdev/morivis"
				target="_blank"
				rel="noopener noreferrer"
				><MdiGithubIcon class="h-8 w-8" />
				<span>GitHub</span></a
			>

			<a
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				href="https://www.forest.ac.jp/"
				target="_blank"
				rel="noopener noreferrer"
				><MdiWebIcon class="h-8 w-8" />
				<span>森林文化アカデミー Webサイト</span></a
			>

			<a
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				href="https://morinos.net/"
				target="_blank"
				rel="noopener noreferrer"
				><MdiWebIcon class="h-8 w-8" />
				<span>morinos Webサイト</span></a
			>

			{#if canShowInstallButton}
				<button
					class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
					onclick={pwaInstall}
					><GrommetIconsInstallOptionIcon class="h-8 w-8 scale-95" />
					<span>アプリをインストール</span>
				</button>
			{/if}
			<button
				class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
				onclick={goHome}
				disabled={$isBlocked}
				><HeroiconsPower16SolidIcon class="h-8 w-8" />
				<span>トップページへ</span></button
			>

			{#if import.meta.env.MODE === 'development' || import.meta.env.MODE === 'mobile'}
				<button
					class="hover:text-accent transition-text flex w-full cursor-pointer items-center justify-start gap-2 p-2 duration-150"
					onclick={() => location.reload()}
					><MaterialSymbolsCodeRoundedIcon class="h-8 w-8 scale-95" />
					<span>再読み込み</span>
				</button>

				<Switch label="デバッグモード" bind:value={$isDebugMode} />
			{/if}
		</ui>
		<!-- <ui class="mt-auto text-end"> Ver. 0.1.0 beta </ui> -->
	</div>
{/if}

<style>
</style>
