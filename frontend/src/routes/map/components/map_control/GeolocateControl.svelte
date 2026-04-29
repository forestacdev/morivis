<script lang="ts">
	import Icon from '@iconify/svelte';
	import { GeolocateControl, LngLat, type EaseToOptions } from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';

	let controlContainer = $state<HTMLDivElement | null>(null);
	let observer: MutationObserver | null = null;
	let controlState = $state<string>('');
	let geolocateControl: ZoomPreservingGeolocateControl | null = null;

	// 現在地表示の際にズームレベルを維持するためのオーバーライド
	class ZoomPreservingGeolocateControl extends GeolocateControl {
		override _updateCamera = (position: GeolocationPosition) => {
			const center = new LngLat(position.coords.longitude, position.coords.latitude);
			const duration =
				typeof this.options.fitBoundsOptions?.duration === 'number'
					? this.options.fitBoundsOptions.duration
					: 500;
			const easeOptions: EaseToOptions = {
				center,
				zoom: this._map.getZoom(),
				bearing: this._map.getBearing(),
				pitch: this._map.getPitch(),
				duration
			};

			this._map.easeTo(easeOptions, {
				geolocateSource: true
			});
		};
	}

	const handleClassChange = (mutations: MutationRecord[]) => {
		const mutation = mutations[0];

		if (mutation.attributeName === 'class') {
			const target = mutation.target as HTMLElement;
			if (target.classList.contains('maplibregl-ctrl-geolocate-waiting')) {
				// 処理中
				controlState = 'waiting';
				showNotification('現在位置を取得中...', 'info');
				return;
			} else if (
				target.classList.contains('maplibregl-ctrl-geolocate-active') ||
				target.classList.contains('maplibregl-ctrl-geolocate-background')
			) {
				// 現在位置表示中
				controlState = 'active';

				return;
			} else if (
				target.classList.contains('maplibregl-ctrl-geolocate-error') ||
				target.classList.contains('maplibregl-ctrl-geolocate-background-error')
			) {
				controlState = 'error';
				showNotification('現在位置を取得できませんでした。', 'error');
				return;
			} else {
				// 現在位置表示していない
				controlState = '';
			}
		}
	};

	onMount(() => {
		mapStore.onInitialized((map) => {
			if (map) {
				geolocateControl = new ZoomPreservingGeolocateControl({
					positionOptions: {
						enableHighAccuracy: true
					},
					fitBoundsOptions: { maxZoom: 18 },
					trackUserLocation: true,
					showUserLocation: true
				});

				// MutationObserver の設定
				if (controlContainer && geolocateControl) {
					controlContainer.appendChild(geolocateControl.onAdd(map));
					observer = new MutationObserver(handleClassChange);
					observer.observe(geolocateControl._container.children[0], {
						attributes: true,
						attributeFilter: ['class']
					});
				}
			}
		});
	});

	onDestroy(() => {
		observer?.disconnect();
		observer = null;
		geolocateControl?.onRemove();
		geolocateControl = null;
	});
</script>

<div
	class="pointer-events-auto relative grid h-[50px] w-[50px] shrink-0 place-items-center overflow-hidden lg:drop-shadow-lg"
	bind:this={controlContainer}
>
	<Icon
		icon="f7:location-fill"
		class="absolute h-6 w-6 {controlState === 'waiting'
			? 'css-rotate text-accent'
			: controlState === 'active'
				? 'text-accent'
				: controlState === 'error'
					? 'text-red-500'
					: 'text-base'}"
	/>
</div>

<style>
	:global(.css-rotate) {
		animation: scale 1s ease infinite;
	}
	@keyframes scale {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.5);
		}
		100% {
			transform: scale(1);
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
