<script lang="ts">
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
	import { isStreetView, isStyleEdit } from '$routes/stores';
	import { onMount } from 'svelte';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		featureMenuData: FeatureMenuData | null;
	}

	let { showDataEntry, featureMenuData }: Props = $props();
	let initialized = $state<boolean>(false);

	const footerHeight = 70; // フッターの高さを設定

	isActiveMobileMenu.subscribe((value) => {
		if (value && initialized) {
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

		initialized = true;
	});
</script>

<!-- フッターのメニュー -->
{#if !featureMenuData && !showDataEntry && !$isStyleEdit && !$isStreetView}
	<div
		transition:fly={{ y: 100, duration: 300 }}
		class="bg-main absolute bottom-0 left-0 z-20 flex w-full flex-col text-base lg:hidden {showDataEntry}"
	>
		<div class="flex w-full items-center justify-between" style="height: {footerHeight}px;">
			<button
				class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
				onclick={() => ($isActiveMobileMenu = 'map')}
			>
				<div
					class="rounded-full px-4 py-1 transition-colors duration-150 {$isActiveMobileMenu ===
					'map'
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

				<span class="text-xs">レイヤ</span>
			</button>
			<button
				class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
				onclick={() => ($isActiveMobileMenu = 'data')}
			>
				<div
					class="rounded-full px-4 py-1 transition-colors duration-150 {$isActiveMobileMenu ===
					'data'
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
					<Icon icon="basil:other-1-outline" class="h-8 w-8" />
				</div>
				<span class="text-xs">その他</span>
			</button>
		</div>
		<div style="height: env(safe-area-inset-bottom);" class="w-full"></div>
	</div>
{/if}

<style>
</style>
