<script>
	import Attribution from '$routes/map/components/Attribution.svelte';
	import ScaleControl from '$routes/map/components/map_control/ScaleControl.svelte';
	import { showLayerMenu } from '$routes/stores/ui';
	import { slide } from 'svelte/transition';
</script>

<!-- フッター余白 出典表示 -->
<div
	class="bg-main relative w-full shrink-0 p-1 pr-4 text-end text-xs font-light text-white/80 max-lg:hidden"
>
	<Attribution />
	<ScaleControl />
</div>
