<script lang="ts">
	import JSONEditor from 'jsoneditor';
	import type { Map } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';

	import { debugJson } from '$routes/map/debug/store';
	import { mapStore } from '$routes/map/store/map';

	let editor: any;
	let container: HTMLElement;
	let { map } = $props();

	onMount(() => {
		// JSONEditorの初期化
		editor = new JSONEditor(container, {
			mode: 'view', // 'tree', 'view', 'form', 'text', 'code'など
			modes: ['code', 'form', 'text', 'tree', 'view'], // 利用可能なモード
			language: 'en',
			onChange: () => {}
		});

		// 初期値を設定

		// $effect(() => {
		// 	if (map) {
		// 		editor.set(map.getStyle());
		// 	}
		// });

		debugJson.subscribe((value) => {
			editor.set(value);
		});
	});

	onDestroy(() => {
		// エディターをクリーンアップ
		if (editor) {
			editor.destroy();
			editor = null;
		}
	});
</script>

<div class=" z-10 h-[600px] max-h-full w-[500px] overflow-y-auto" bind:this={container}></div>

<style>
</style>
