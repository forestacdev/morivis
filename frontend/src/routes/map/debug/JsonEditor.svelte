<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import JSONEditor from 'jsoneditor';
	import { mapStore } from '$routes/map/store/map';
	import type { Map } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';

	let editor: any;
	let container: HTMLElement;
	let { map } = $props();

	onMount(() => {
		// JSONEditorの初期化
		editor = new JSONEditor(container, {
			mode: 'view', // 'tree', 'view', 'form', 'text', 'code'など
			language: 'en',
			onChange: () => {
				console.log('JSON changed:', editor.get());
			}
		});

		// 初期値を設定

		$effect(() => {
			if (map) {
				editor.set(map.getStyle());
			}
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

<div class="jsoneditor-container" bind:this={container}></div>

<style>
	.jsoneditor-container {
		z-index: 100;
		position: absolute;
		height: 600px;
		width: 600px;
		border: 1px solid #ccc;
	}
</style>
