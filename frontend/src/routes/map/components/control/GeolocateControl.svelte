<script lang="ts">
	import Icon from '@iconify/svelte';
	import { GeolocateControl } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { mapStore } from '$map/store/map';

	let controlContainer: HTMLDivElement;
	let observer;
	let state: string = '';

	const handleClassChange = (mutations) => {
		// console.log('クラスが変更されました:', mutations);
		if (!Array.isArray(mutations) && mutations.length === 0) return;

		const mutation = mutations[0];

		if (mutation.attributeName === 'class') {
			const target = mutation.target as HTMLElement;
			if (target.classList.contains('maplibregl-ctrl-geolocate-waiting')) {
				// 処理中
				state = 'waiting';
				console.log('現在位置取得中');
				return;
			} else if (
				target.classList.contains('maplibregl-ctrl-geolocate-active') ||
				target.classList.contains('maplibregl-ctrl-geolocate-background')
			) {
				// 現在位置表示中
				state = 'active';
				console.log('現在位置表示中');
				return;
			} else if (
				target.classList.contains('maplibregl-ctrl-geolocate-error') ||
				target.classList.contains('maplibregl-ctrl-geolocate-background-error')
			) {
				state = 'error';
				console.log('現在位置取得エラー');
				return;
			} else {
				// 現在位置表示していない
				state = '';
				console.log('現在位置表示していない');
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
			}
		});
	});
</script>

<div
	class="bg-main absolute right-2 top-2 grid h-[60px] w-[60px] place-items-center overflow-hidden rounded-full"
	bind:this={controlContainer}
>
	<Icon
		icon="streamline:location-target-1-solid"
		class="absolute h-8 w-8 text-black {state === 'waiting'
			? 'css-anime'
			: state === 'active'
				? 'text-green-500'
				: state === 'error'
					? 'text-red-500'
					: 'text-black'}"
	/>
</div>

<style>
	.css-anime {
		animation: rotate 1s infinite;
		@keyframes rotate {
			0% {
				transform: rotate(0deg);
			}
			100% {
				transform: rotate(360deg);
			}
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
</style>
