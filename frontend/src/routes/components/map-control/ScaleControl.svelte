<script lang="ts">
	import { ScaleControl } from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	import { mapStore } from '$routes/store/map';

	let controlContainer = $state<HTMLDivElement | null>(null);
	let scaleControl: ScaleControl | null = null;
	let isControlAdded = false;

	// TODO: ページ遷移後に二重になる
	onMount(() => {
		mapStore.onInitialized((map) => {
			if (map && controlContainer && !isControlAdded) {
				// 既存のスケールコントロールがあれば削除
				if (scaleControl) {
					try {
						scaleControl.onRemove();
					} catch (e) {
						console.warn('Error removing existing scale control:', e);
					}
				}

				// 新しいスケールコントロールを作成
				scaleControl = new ScaleControl({
					maxWidth: 100,
					unit: 'metric'
				});

				// コンテナをクリア
				controlContainer.innerHTML = '';

				// スケールバーのコントロールをコンテナに追加
				controlContainer.appendChild(scaleControl.onAdd(map));
				isControlAdded = true;
			}
		});
	});

	onDestroy(() => {
		console.log('ScaleControl component destroyed');

		if (scaleControl) {
			try {
				scaleControl.onRemove();
			} catch (e) {
				console.warn('Error removing scale control:', e);
			}
			scaleControl = null;
		}

		if (controlContainer) {
			controlContainer.innerHTML = '';
		}

		isControlAdded = false;
	});
</script>

<div class="absolute bottom-2 left-2 z-20" bind:this={controlContainer}></div>
