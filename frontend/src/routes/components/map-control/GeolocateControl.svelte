<script lang="ts">
	import Icon from '@iconify/svelte';
	import { GeolocateControl, Marker } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { mapStore } from '$routes/store/map';

	let controlContainer: HTMLDivElement;
	let observer;
	let state: string = '';

	const handleClassChange = (mutations: MutationRecord[]) => {
		const mutation = mutations[0];

		if (mutation.attributeName === 'class') {
			const target = mutation.target as HTMLElement;
			if (target.classList.contains('maplibregl-ctrl-geolocate-waiting')) {
				// 処理中
				state = 'waiting';
				return;
			} else if (
				target.classList.contains('maplibregl-ctrl-geolocate-active') ||
				target.classList.contains('maplibregl-ctrl-geolocate-background')
			) {
				// 現在位置表示中
				state = 'active';
				return;
			} else if (
				target.classList.contains('maplibregl-ctrl-geolocate-error') ||
				target.classList.contains('maplibregl-ctrl-geolocate-background-error')
			) {
				state = 'error';
				return;
			} else {
				// 現在位置表示していない
				state = '';
			}
		}
	};

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
					observer.observe(geolocateControl._container.children[0], {
						attributes: true,
						attributeFilter: ['class']
					});
				}

				// TODO: 現在地の経緯度
				// geolocateControl.on('geolocate', (e) => {
				// 	console.log('geolocate', e.coords);
				// });
			}
		});
	});
</script>

<div
	class="pointer-events-auto relative grid h-[50px] w-[50px] shrink-0 place-items-center overflow-hidden drop-shadow-lg"
	bind:this={controlContainer}
>
	<Icon
		icon="streamline:location-target-1-solid"
		class="absolute h-6 w-6 {state === 'waiting'
			? 'css-rotate text-accent'
			: state === 'active'
				? 'text-accent'
				: state === 'error'
					? 'text-red-500'
					: 'text-base'}"
	/>
</div>

<style>
	:global(.css-rotate) {
		animation: spin 2s linear infinite;
	}
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	:global(.maplibregl-ctrl-group) {
		box-shadow: none !important;
		border-radius: 0 !important;
		overflow: hidden;
		width: 100% !important;
		height: 100% !important;
		background-color: transparent !important;
	}
	:global(.maplibregl-ctrl-geolocate) {
		position: auto !important;
		width: 100% !important;
		height: 100% !important;
	}
	:global(.maplibregl-ctrl-geolocate:hover) {
		background-color: transparent !important;
	}
	:global(.maplibregl-ctrl-group::has(.maplibregl-ctrl-geolocate) > button) {
		width: 100% !important;
		height: 100% !important;
		position: absolute !important;
	}

	:global(.maplibregl-ctrl-geolocate > span) {
		display: none !important;
	}

	/* マーカースタイル */
	/* :global(.maplibregl-user-location-dot) {
		display: none !important;
	}

	:global(.maplibregl-user-location-accuracy-circle) {
		display: none !important;
	} */
</style>
