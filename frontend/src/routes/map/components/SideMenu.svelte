<script lang="ts">
	import Icon from '@iconify/svelte';
	import { indexOf } from 'es-toolkit/compat';
	import gsap from 'gsap';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import Logo from '$map/components/Logo.svelte';
	import { showSideMenu, showDataMenu, mapMode, showInfoDialog, showTermsDialog } from '$map/store';
	import { mapStore } from '$map/store/map';

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

	onMount(() => {});

	mapMode.subscribe((mode) => {
		showSideMenu.set(false);
	});
</script>

{#if $showSideMenu}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute z-10 h-full w-full bg-black bg-opacity-50"
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
		class="bg-main absolute z-20 flex h-full w-[300px] flex-col gap-2 p-2"
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
				onclick={() => mapMode.set('style')}
			>
				<Icon icon="ic:round-layers" class="h-8 w-8" />
				<span>地図を編集</span>
			</button>
			<button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				onclick={() => mapMode.set('analysis')}
			>
				<Icon icon="streamline:code-analysis-solid" class="h-8 w-8" />
				<span>地図の解析</span>
			</button>
			<button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				onclick={toggleDataMenu}
			>
				<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" />
				<span>データカタログ</span>
			</button>
			<button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
			>
				<Icon icon="weui:setting-filled" class="h-8 w-8" />
				<span>設定</span>
			</button>
		</ui>
		<div class="w-hull bg-base h-[1px] rounded-full"></div>
		<ui>
			<button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				onclick={toggleTermsDialog}
			>
				<Icon icon="majesticons:note-text" class="h-8 w-8" />
				<span>利用規約</span>
			</button>
			<button
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				onclick={toggleInfoDialog}
			>
				<Icon icon="akar-icons:info-fill" class="h-8 w-8" />
				<span>演習林GISについて</span>
			</button>

			<a
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				href="https://www.forest.ac.jp/"
				target="_blank"
				rel="noopener noreferrer"
				><Icon icon="mdi:web" class="h-8 w-8" />
				<span>森林文化アカデミーHP</span></a
			>
		</ui>
	</div>
{/if}

<style>
</style>
