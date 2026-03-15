<script lang="ts">
	import Icon from '@iconify/svelte';

	import { isGlobe } from '$routes/stores/map';
	import { mapStore } from '$routes/stores/map';

	const toggleGlobe = () => {
		isGlobe.set(!$isGlobe);
		const map = mapStore.getMap();
		if (map) {
			map.setProjection({ type: $isGlobe ? 'globe' : 'mercator' });
		}
	};
</script>

<button
	onclick={toggleGlobe}
	class="pointer-events-auto grid shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg"
>
	<Icon icon={'mdi:earth'} class="h-8 w-8 {$isGlobe ? 'text-accent' : 'text-base'}" />
</button>
