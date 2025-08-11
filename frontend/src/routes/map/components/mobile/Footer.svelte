<script lang="ts">
	import { checkMobile, type MobileActiveMenu } from '$routes/map/utils/ui';
	import {
		showLayerMenu,
		showDataMenu,
		showOtherMenu,
		isActiveMobileMenu
	} from '$routes/stores/ui';
	import Icon from '@iconify/svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { fly } from 'svelte/transition';
	import { isStyleEdit } from '$routes/stores';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		featureMenuData: FeatureMenuData | null;
	}

	let { showDataEntry, featureMenuData }: Props = $props();

	const footerHeight = 70; // フッターの高さを設定

	isActiveMobileMenu.subscribe((value) => {
		if (value && checkMobile()) {
			switch (value) {
				case 'map':
					showDataMenu.set(false);
					showLayerMenu.set(false);
					showOtherMenu.set(false);
					break;
				case 'layer':
					showDataMenu.set(false);
					showLayerMenu.set(true);
					showOtherMenu.set(false);
					break;
				case 'data':
					showDataMenu.set(true);
					showLayerMenu.set(false);
					showOtherMenu.set(false);
					break;
				case 'other':
					showDataMenu.set(false);
					showLayerMenu.set(false);
					showOtherMenu.set(true);
					break;
				default:
			}
		}
	});
</script>

<!-- フッターのメニュー -->
{#if !featureMenuData && !showDataEntry && !$isStyleEdit}
	<div
		transition:fly={{ y: 100, duration: 300 }}
		class="bg-main absolute bottom-0 left-0 z-20 flex w-full items-center justify-between text-base lg:hidden {showDataEntry}"
		style="height: {footerHeight}px;"
	>
		<button
			class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
			onclick={() => ($isActiveMobileMenu = 'map')}
		>
			<div
				class="rounded-full px-4 py-1 transition-colors duration-150 {$isActiveMobileMenu === 'map'
					? 'bg-accent'
					: ''}"
			>
				<Icon icon="ph:map-pin-area-fill" class="h-8 w-8" />
			</div>

			<span class="text-xs">地図</span>
		</button>
		<button
			class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
			onclick={() => ($isActiveMobileMenu = 'layer')}
		>
			<div
				class="rounded-full px-4 py-1 transition-colors duration-150 {$isActiveMobileMenu ===
				'layer'
					? 'bg-accent'
					: ''}"
			>
				<Icon icon="jam:layers-f" class="h-8 w-8" />
			</div>

			<span class="text-xs">レイヤー</span>
		</button>
		<button
			class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
			onclick={() => ($isActiveMobileMenu = 'data')}
		>
			<div
				class="rounded-full px-4 py-1 transition-colors duration-150 {$isActiveMobileMenu === 'data'
					? 'bg-accent'
					: ''}"
			>
				<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" />
			</div>
			<span class="text-xs">データ</span>
		</button>
		<button
			class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
			onclick={() => ($isActiveMobileMenu = 'other')}
		>
			<div
				class="rounded-full px-4 py-1 transition-colors duration-150 {$isActiveMobileMenu ===
				'other'
					? 'bg-accent'
					: ''}"
			>
				<Icon icon="basil:other-1-outline" class="h-9 w-9" />
			</div>
			<span class="text-xs">その他</span>
		</button>
	</div>
{/if}

<!-- フッターの余白分 -->
<!-- <div
	class="bg-main bottom-0 left-0 flex w-full items-center justify-between text-base lg:hidden {showDataEntry
		? 'hidden'
		: ''}"
	style="height: {footerHeight}px;"
></div> -->

<style>
</style>
