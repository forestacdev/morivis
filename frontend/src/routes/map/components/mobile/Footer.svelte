<script lang="ts">
	import { mapStore } from '$routes/stores/map';

	import { showLayerMenu, showDataMenu, showSideMenu } from '$routes/stores/ui';
	import Icon from '@iconify/svelte';

	type Active = 'map' | 'layer' | 'data';

	let active = $state<Active>('map');

	$effect(() => {
		if (active) {
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
					showDataMenu.set(false);
					showLayerMenu.set(false);
					showSideMenu.set(false);
			}
		}
	});
</script>

<!-- フッターのメニュー -->
<div
	class="bg-main absolute bottom-0 left-0 z-10 flex h-[60px] w-full items-center justify-between text-base lg:hidden"
>
	<button
		class="flex h-full w-full cursor-pointer items-center justify-center {active === 'map'
			? 'bg-accent'
			: ''}"
		onclick={() => (active = 'map')}
	>
		<Icon icon="ph:map-pin-area-fill" class="h-9 w-9" />
	</button>
	<button
		class="flex h-full w-full cursor-pointer items-center justify-center"
		onclick={() => (active = 'layer')}
	>
		<Icon icon="jam:layers-f" class="h-9 w-9" />
	</button>
	<button
		class="flex h-full w-full cursor-pointer items-center justify-center"
		onclick={() => (active = 'data')}
	>
		<Icon icon="material-symbols:data-saver-on-rounded" class="h-9 w-9" />
	</button>
</div>

<!-- フッターの余白分 -->
<div
	class="bg-main bottom-0 left-0 flex h-[60px] w-full items-center justify-between text-base lg:hidden"
></div>

<style>
</style>
