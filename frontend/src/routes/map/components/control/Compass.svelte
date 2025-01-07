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

	import { mapStore } from '$routes/map/store/map';

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
	class="bg-main absolute right-2 top-2 grid h-[80px] w-[80px] place-items-center rounded-full p-2"
>
	<Icon icon="mdi:compass-outline" class="h-12 w-12 -rotate-[45deg] text-base" />
</div>

<style>
</style>
