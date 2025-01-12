<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import Geocoder from '$map/components/control/Geocoder.svelte';
	import { showSideMenu } from '$map/store';
	import { mapStore } from '$map/store/map';

	onMount(() => {});
</script>

<div
	class="pointer-events-none absolute left-0 top-0 z-10 flex w-full flex-grow items-center justify-start gap-2 p-2"
>
	<button
		class="bg-main pointer-events-auto rounded-full p-2 text-left"
		onclick={() => showSideMenu.set(true)}
	>
		<Icon icon="ic:round-menu" class="h-6 w-6" />
	</button>
	<Geocoder />
</div>

<style>
</style>
