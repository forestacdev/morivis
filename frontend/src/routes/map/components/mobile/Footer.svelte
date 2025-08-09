<script lang="ts">
	import { checkMobile, type MobileActiveMenu } from '$routes/map/utils/ui';
	import { showLayerMenu, showDataMenu, showOtherMenu } from '$routes/stores/ui';
	import Icon from '@iconify/svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry }: Props = $props();

	let active = $state<MobileActiveMenu>('map');

	$effect(() => {
		if (active && checkMobile()) {
			switch (active) {
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

	const footerHeight = 70; // フッターの高さを設定
</script>

<!-- フッターのメニュー -->
<div
	class="bg-main absolute bottom-0 left-0 z-20 flex w-full items-center justify-between text-base lg:hidden {showDataEntry
		? 'hidden'
		: ''}"
	style="height: {footerHeight}px;"
>
	<button
		class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
		onclick={() => (active = 'map')}
	>
		<div class="rounded-full px-4 py-1 {active === 'map' ? 'bg-accent' : ''}">
			<Icon icon="ph:map-pin-area-fill" class="h-8 w-8" />
		</div>

		<span class="text-xs">地図</span>
	</button>
	<button
		class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
		onclick={() => (active = 'layer')}
	>
		<div class="rounded-full px-4 py-1 {active === 'layer' ? 'bg-accent' : ''}">
			<Icon icon="jam:layers-f" class="h-8 w-8" />
		</div>

		<span class="text-xs">レイヤー</span>
	</button>
	<button
		class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
		onclick={() => (active = 'data')}
	>
		<div class="rounded-full px-4 py-1 {active === 'data' ? 'bg-accent' : ''}">
			<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" />
		</div>
		<span class="text-xs">データ</span>
	</button>
	<button
		class="flex h-full w-full cursor-pointer flex-col items-center justify-center"
		onclick={() => (active = 'other')}
	>
		<div class="rounded-full px-4 py-1 {active === 'other' ? 'bg-accent' : ''}">
			<Icon icon="basil:other-1-outline" class="h-9 w-9" />
		</div>
		<span class="text-xs">その他</span>
	</button>
</div>

<!-- フッターの余白分 -->
<div
	class="bg-main bottom-0 left-0 flex w-full items-center justify-between text-base lg:hidden {showDataEntry
		? 'hidden'
		: ''}"
	style="height: {footerHeight}px;"
></div>

<style>
</style>
