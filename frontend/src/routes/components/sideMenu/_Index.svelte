<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import Logo from '$routes/components/sideMenu/Logo.svelte';
	import {
		showSideMenu,
		showDataMenu,
		mapMode,
		showInfoDialog,
		showTermsDialog
	} from '$routes/store';
	import { mapStore } from '$routes/store/map';

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
</script>

{#if $showSideMenu}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute left-0 top-0 z-30 h-full w-full bg-black bg-opacity-50"
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
		class="bg-main absolute left-0 top-0 z-30 flex h-full w-[400px] flex-col gap-2 p-2"
	>
		<div class="flex items-center justify-between">
			<Logo />
			<button onclick={() => showSideMenu.set(false)} class="bg-base rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
			</button>
		</div>
		<ui>
			<button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				onclick={() => mapMode.set('edit')}
			>
				<Icon icon="ic:round-layers" class="h-8 w-8" />
				<span class="select-none">地図を編集</span>
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
				<span class="select-none">データカタログ</span>
			</button>
			<button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
			>
				<Icon icon="weui:setting-filled" class="h-8 w-8" />
				<span class="select-none">設定</span>
			</button>
		</ui>
		<div class="w-hull bg-base h-[1px] rounded-full"></div>
		<ui>
			<button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				onclick={toggleTermsDialog}
			>
				<Icon icon="majesticons:note-text" class="h-8 w-8" />
				<span class="select-none">利用規約</span>
			</button>
			<button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				onclick={toggleInfoDialog}
			>
				<Icon icon="akar-icons:info-fill" class="h-8 w-8" />
				<span class="select-none">このアプリについて</span>
			</button>
			<a
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				href="https://github.com/forestacdev/enshurin-viewer"
				target="_blank"
				rel="noopener noreferrer"
				><Icon icon="mdi:github" class="h-8 w-8" />
				<span>GitHub</span></a
			>

			<a
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
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
