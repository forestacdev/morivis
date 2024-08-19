<script lang="ts">
	import Icon from '@iconify/svelte';

	import { isSide } from '$lib/store/store';
</script>

<div
	class="bg-color-base absolute left-4 h-full overflow-visible rounded p-4 text-slate-100 shadow-2xl transition-all duration-200 {$isSide ===
	'raster'
		? ''
		: 'menu-out'}"
>
	ssss
</div>

<style>
</style>
