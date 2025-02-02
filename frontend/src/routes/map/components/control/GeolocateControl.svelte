<script lang="ts">
	import { GeolocateControl } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { mapStore } from '$map/store/map';

	let controlContainer: HTMLDivElement;
	let observer;

	function handleClassChange(mutations) {
		// console.log('クラスが変更されました:', mutations);
		mutations.forEach((mutation) => {
			if (mutation.attributeName === 'class') {
				const target = mutation.target as HTMLElement;
				if (
					target.classList.contains('maplibregl-ctrl-geolocate-active') ||
					target.classList.contains('maplibregl-ctrl-geolocate-background')
				) {
					// 現在位置表示中
					console.log('現在位置表示');
				} else if (target.classList.contains('maplibregl-ctrl-geolocate-waiting')) {
					// 現在位置表示していない
					console.log('現在位置取得中');
				} else if (
					target.classList.contains('maplibregl-ctrl-geolocate-error') ||
					target.classList.contains('maplibregl-ctrl-geolocate-background-error')
				) {
					console.log('現在位置取得エラー');
				} else {
					// 現在位置表示していない
					console.log('現在位置表示していない');
				}
			}
		});
	}

	onMount(() => {
		mapStore.onInitialized((map) => {
			if (map) {
				// 現在位置表示コントロール
				const geolocateControl = new GeolocateControl({
					positionOptions: {
						enableHighAccuracy: true
					},
					fitBoundsOptions: { maxZoom: 12 },
					trackUserLocation: true,
					showUserLocation: true
				});
				controlContainer.appendChild(geolocateControl.onAdd(map));

				// MutationObserver の設定
				if (controlContainer) {
					observer = new MutationObserver(handleClassChange);
					console.log(geolocateControl._container);
					observer.observe(geolocateControl._container.children[0], {
						attributes: true,
						attributeFilter: ['class']
					});
				}
			}
		});
	});
</script>

<div class="absolute right-2 top-2" bind:this={controlContainer}></div>

<style>
</style>
