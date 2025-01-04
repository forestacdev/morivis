<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import { isSide } from '$map/store';
	import { mapStore } from '$map/store/map';

	onMount(() => {
		// 初期のMapbox式を受け取り、オブジェクト形式に変換する
		// isSide.set('base');
	});
</script>

<div class="bg-main z-10 w-full flex-grow p-2 opacity-50">これがヘッダー</div>

<style>
</style>
