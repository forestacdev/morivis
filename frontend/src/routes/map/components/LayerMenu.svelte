<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';

	let { value = $bindable() } = $props();

	import { mapStore } from '$map/store/map';

	onMount(() => {
		// 初期のMapbox式を受け取り、オブジェクト形式に変換する
		// isSide.set('base');
	});
</script>

<div class="bg-main absolute z-10 h-full w-[200px] p-2">sss</div>

<style>
</style>
