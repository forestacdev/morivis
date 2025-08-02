<script lang="ts">
	import { mapStore } from '$routes/stores/map';
	import { showDataMenu } from '$routes/stores';
	import { isPc } from '$routes/map/utils/ui';
	import Icon from '@iconify/svelte';
</script>

<div
	class="bg-main bottom-0 left-0 flex h-[60px] w-full items-center justify-between text-base lg:hidden"
>
	<button class="flex h-full w-full cursor-pointer items-center justify-center">
		<Icon icon="ph:map-pin-area-fill" class="h-10 w-10" />
	</button>
	<button class="flex h-full w-full cursor-pointer items-center justify-center">
		<Icon icon="jam:layers-f" class="h-10 w-10" />
	</button>
	<button
		class="flex h-full w-full cursor-pointer items-center justify-center"
		onclick={() => showDataMenu.set(true)}
	>
		<Icon icon="material-symbols:data-saver-on-rounded" class="h-10 w-10" />
	</button>
</div>

<style>
</style>
