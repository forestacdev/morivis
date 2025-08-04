<script lang="ts">
	import { checkMobile, type MobileActiveMenu } from '$routes/map/utils/ui';
	import { showLayerMenu, showDataMenu, showSideMenu } from '$routes/stores/ui';
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
					showSideMenu.set(false);
					break;
				case 'layer':
					showDataMenu.set(false);
					showLayerMenu.set(true);
					showSideMenu.set(false);
					break;
				case 'data':
					showDataMenu.set(true);
					showLayerMenu.set(false);
					showSideMenu.set(false);
					break;
				default:
			}
		}
	});
</script>

<!-- フッターのメニュー -->
<div
	class="bg-main absolute bottom-0 left-0 z-20 flex h-[60px] w-full items-center justify-between text-base lg:hidden {showDataEntry
		? 'hidden'
		: ''}"
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
</div>

<!-- フッターの余白分 -->
<div
	class="bg-main bottom-0 left-0 flex h-[60px] w-full items-center justify-between text-base lg:hidden {showDataEntry
		? 'hidden'
		: ''}"
></div>

<style>
</style>
