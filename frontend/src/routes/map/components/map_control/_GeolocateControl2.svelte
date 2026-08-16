<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onDestroy, onMount } from 'svelte';

	import { Marker, type LngLatLike, type Map as MapLibreMap } from '$routes/map/utils/maplibre';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';

	let map = $state<MapLibreMap | null>(null);
	let controlState = $state<'waiting' | 'active' | 'error' | ''>('');
	let userLocationMarker: Marker | null = null;
	let userLocationElement: HTMLDivElement | null = null;
	let watchId = $state<number | null>(null);
	let ignoreNextMoveStart = false;
	let unsubscribeMoveStart: (() => void) | null = null;

	const GEOLocation_OPTIONS = {
		enableHighAccuracy: true,
		timeout: 10000,
		maximumAge: 0
	} as const;

	const createUserLocationElement = () => {
		const element = document.createElement('div');
		element.className = 'user-location-marker';
		return element;
	};

	const ensureUserLocationMarker = () => {
		if (!map) return null;

		if (!userLocationElement) {
			userLocationElement = createUserLocationElement();
		}

		if (!userLocationMarker) {
			userLocationMarker = new Marker({
				element: userLocationElement
			})
				.setLngLat([0, 0])
				.addTo(map);
		}

		return userLocationMarker;
	};

	const setUserLocation = (lngLat: LngLatLike) => {
		const marker = ensureUserLocationMarker();
		if (!marker) return;

		marker.setLngLat(lngLat);
		ignoreNextMoveStart = true;
		map?.once('moveend', () => {
			ignoreNextMoveStart = false;
		});
		mapStore.easeTo({
			center: lngLat,
			duration: 600
		});
	};

	const stopTracking = (showMessage = true) => {
		if (watchId !== null) {
			navigator.geolocation.clearWatch(watchId);
			watchId = null;
		}

		if (controlState === 'active' || controlState === 'waiting') {
			controlState = '';
		}

		if (showMessage) {
			showNotification('現在地の追従を解除しました。', 'info');
		}
	};

	const startTracking = () => {
		if (!map) return;

		if (!navigator.geolocation) {
			controlState = 'error';
			showNotification('このブラウザでは現在地を取得できません。', 'error');
			return;
		}

		controlState = 'waiting';
		showNotification('現在位置の追従を開始します...', 'info');

		watchId = navigator.geolocation.watchPosition(
			(position) => {
				controlState = 'active';
				setUserLocation([position.coords.longitude, position.coords.latitude]);
			},
			() => {
				controlState = 'error';
				stopTracking(false);
				showNotification('現在位置を取得できませんでした。', 'error');
			},
			GEOLocation_OPTIONS
		);
	};

	const toggleTracking = () => {
		if (!map) return;

		if (watchId !== null) {
			stopTracking();
			return;
		}

		startTracking();
	};

	onMount(() => {
		mapStore.onInitialized((initializedMap) => {
			map = initializedMap;
		});

		unsubscribeMoveStart = mapStore.onMoveStart(() => {
			if (watchId === null || ignoreNextMoveStart) {
				return;
			}

			stopTracking(false);
			showNotification('地図操作により現在地の追従を解除しました。', 'info');
		});
	});

	onDestroy(() => {
		stopTracking(false);
		unsubscribeMoveStart?.();
		unsubscribeMoveStart = null;
		userLocationMarker?.remove();
		userLocationMarker = null;
		userLocationElement = null;
	});
</script>

<div
	class="pointer-events-auto relative grid h-[50px] w-[50px] shrink-0 place-items-center overflow-hidden lg:drop-shadow-lg"
>
	<button
		type="button"
		class="absolute inset-0 cursor-pointer"
		aria-label={watchId !== null ? '現在地の追従を解除' : '現在地の追従を開始'}
		onclick={toggleTracking}
	></button>
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

	:global(.user-location-marker) {
		width: 18px;
		height: 18px;
		border-radius: 9999px;
		background: #3b82f6;
		border: 3px solid rgba(255, 255, 255, 0.95);
		box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.2);
	}
</style>
