<script lang="ts">
	import Icon from '@iconify/svelte';

	import { isTerrain3d } from '$routes/stores/map';

	const toggle3d = () => {
		isTerrain3d.update((enabled) => !enabled);
	};
</script>

<button
	type="button"
	onclick={toggle3d}
	aria-label="3D地形"
	aria-pressed={$isTerrain3d}
	title="3D地形の表示を切り替える"
	class="pointer-events-auto grid shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg"
>
	<Icon icon="ic:round-terrain" class="h-8 w-8 {$isTerrain3d ? 'text-accent' : 'text-base'}" />
</button>
