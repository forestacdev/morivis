<script lang="ts">
	import { ScaleControl } from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	import { mapStore } from '$routes/stores/map';
	import { showDataMenu } from '$routes/stores/ui';

	let scaleControl: ScaleControl | null = null;

	// TODO: ページ遷移後に二重になる
	onMount(() => {
		// 新しいスケールコントロールを作成
		scaleControl = new ScaleControl({
			maxWidth: 100,
			unit: 'metric'
		});
		mapStore.onload(() => {
			const map = mapStore.getMap();
			if (map && scaleControl) {
				map.addControl(scaleControl);
			}
		});

		showDataMenu.subscribe((show) => {
			if (scaleControl && show) {
				// スケールコントロールの位置を調整
				if (scaleControl._container) {
					scaleControl._container.style.left = 'calc(100% - 100px)';
				}
				scaleControl._container.style.display = 'none';
			} else if (scaleControl) {
				// 元の位置に戻す
				if (scaleControl._container) {
					scaleControl._container.style.display = 'block';
				}
			}
		});
	});

	onDestroy(() => {
		const map = mapStore.getMap();
		if (map && scaleControl) {
			map.removeControl(scaleControl);
			scaleControl = null;
		}
	});
</script>
