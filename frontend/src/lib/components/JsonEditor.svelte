<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import JSONEditor from 'jsoneditor';
	import 'jsoneditor/dist/jsoneditor.min.css';
	import { mapStore } from '$routes/map/store/map';

	let editor: any;
	let container: HTMLElement;
	let json = { key: 'value', nested: { key: 'nested value' } };
	// let { mapStyle } = $props();
	let { mapStyle } = $props();

	// JSONを取得する関数
	const getJson = () => {
		if (editor) {
			const updatedJson = editor.get();
			console.log('Updated JSON:', updatedJson);
		}
	};

	onMount(() => {
		// JSONEditorの初期化
		editor = new JSONEditor(container, {
			mode: 'tree', // 'tree', 'view', 'form', 'text', 'code'など
			onChange: () => {
				console.log('JSON changed:', editor.get());
			}
		});

		// 初期値を設定
		editor.set(mapStyle);
	});

	onDestroy(() => {
		// エディターをクリーンアップ
		if (editor) {
			editor.destroy();
			editor = null;
		}
	});

	$effect(() => {
		console.log(mapStyle);
	});
</script>

<div class="jsoneditor-container" bind:this={container}></div>

<button onclick={getJson}>Get JSON</button>

<style>
	.jsoneditor-container {
		z-index: 100;
		position: absolute;
		height: 600px;
		width: 300x;
		border: 1px solid #ccc;
	}
</style>
