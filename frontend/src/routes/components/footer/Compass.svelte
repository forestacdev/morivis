<script lang="ts">
	import Icon from '@iconify/svelte';
	import { gsap } from 'gsap';
	import { Draggable } from 'gsap/Draggable';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker
	} from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { isStreetView } from '$routes/store';
	import { mapStore } from '$routes/store/map';

	gsap.registerPlugin(Draggable);

	const setMapBearing = (e: any) => {
		const mapBearing = e.target.value;
	};

	const setMapZoom = (e: any) => {
		const mapZoom = e.target.value;
	};

	let element = $state<HTMLDivElement | null>(null);
	// let rotation = $state<number>(0);

	// 回転値を -180° 〜 180° の範囲に正規化する関数
	const normalizeAngle = (angle: number): number => {
		return ((angle + 180) % 360) - 180;
	};

	mapStore.onRotate((bearing) => {
		if (bearing) {
			// rotation = bearing;
			if (!element) return;
			element.style.transform = `rotate(${bearing * -1}deg)`;
		}
	});

	onMount(() => {
		if (!element) return;
		Draggable.create(element, {
			type: 'rotation', // 回転モード
			inertia: true, // 慣性を有効化
			onDrag: function () {
				const rotation = normalizeAngle(this.rotation); // 回転値を正規化して保持
				const map = mapStore.getMap();
				if (map) {
					map.setBearing(rotation * -1); // マップの回転を更新
					// map.easeTo({ bearing: rotation * -1 });
				}
			}
			// onThrowComplete: function () {
			// 	// ドラッグ終了後にスナップ処理
			// 	if (Math.abs(normalizeAngle(rotation)) <= 7) {
			// 		gsap.to(element, {
			// 			rotation: 0, // 0度にスナップ
			// 			duration: 0.3, // アニメーションの長さ
			// 			onUpdate: () => {
			// 				rotation = normalizeAngle(this.targets()[0]._gsTransform.rotation);
			// 			}
			// 		});
			// 	}
			// }
		});
	});
</script>

<div
	bind:this={element}
	class="bg-main absolute bottom-[40px] right-[20px] grid h-[150px] w-[150px] place-items-center overflow-hidden rounded-full"
>
	<svg
		class="scale-50"
		xmlns="http://www.w3.org/2000/svg"
		width="132"
		height="132"
		viewBox="0 0 132 132"
	>
		<g transform="translate(47,0)">
			<path fill="#000" d="m19 0 16.455 66H2.545L19 0Z" />
			<path fill="#D9D9D9" d="M19 132 2.546 66h32.909L19 132Z" />
		</g>
	</svg>

	<button
		class="pointer-events-auto absolute h-full w-full bg-white"
		onclick={() => ($isStreetView = !$isStreetView)}>360</button
	>
</div>

<style>
</style>
