<script setup lang="ts">
	// export let lngLat: [number, number];	import { createEventDispatcher } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { getElevation } from '$lib/utils/map';
	import type { LngLat } from 'maplibre-gl';
	import gsap from 'gsap';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/store/map';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';

	const dispatch = createEventDispatcher();
	export let lngLat: LngLat;

	let displayElevation: number = 0;

	const handleButtonClick = (event: Event) => {
		event.stopPropagation(); // クリックイベントの伝播を止める
		dispatch('click', event);
	};

	const scan = (event: Event) => {
		event.stopPropagation(); // クリックイベントの伝播を止める
		dispatch('scan', lngLat);
	};

	onMount(async () => {
		gsap.registerPlugin(ScrollTrigger);
		const zoom = mapStore.getZoom();
		if (!zoom) return;
		// selectFeatureList = [];
		const elevation = (await getElevation(lngLat, zoom)) as number;
		if (elevation !== null) {
			gsap.to(
				{},
				{
					duration: 0.5,
					value: elevation,
					onUpdate: function () {
						displayElevation = Math.round(this.targets()[0].value);
					},
					ease: 'power1.inOut'
				}
			);
		}
	});
</script>

<button on:click={handleButtonClick} class="custom-anime">
	<!-- <Icon icon="f7:scope" width="50" height="50" class="custom-anime" /> -->
	<div class="custom-marker"></div>
	<div class="custom-bar-1"></div>
	<div class="custom-bar-2"></div>
	<div class="custom-point"></div>
	<div class="absolute bottom-[32px] left-[40px]">
		標高<span class="text-lg">{displayElevation}</span>m
	</div>
	<button
		on:click={scan}
		class="pointer-events-auto absolute bottom-0 rounded-full bg-zinc-100 p-1"
	>
		スキャン
	</button>
</button>

<style>
	.custom-marker {
		/* width: 50px;
		height: 50px;
		rotate: 45deg;
		border-radius: 10px;
		border: 1px solid #000;
		animation: pulse 1s infinite; */
	}

	.custom-point {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 10px;
		height: 10px;
		background-color: rgb(40, 40, 40);
		border-radius: 50%;
		transform: translate(-50%, 50%);
	}

	.custom-bar-1 {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 50px;
		height: 1.5px;
		rotate: -45deg;
		background-color: rgb(40, 40, 40);
		transform-origin: 0 0;
	}
	.custom-bar-2 {
		position: absolute;
		bottom: 0;
		left: 35px;
		bottom: 35px;
		width: 70px;
		height: 2px;

		background-color: rgb(40, 40, 40);
		transform-origin: 0 0;
	}
	.custom-anime {
		animation: in 0.3s both ease-in-out;
		width: 150px;
		height: 100px;
		transform: translate(50%, -50%);
		pointer-events: none;
	}

	@keyframes rotate {
		0% {
			rotate: 0;
		}
		100% {
			rotate: 360deg;
		}
	}

	@keyframes in {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}
</style>
