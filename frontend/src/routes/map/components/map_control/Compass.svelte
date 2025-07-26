<script lang="ts">
	import { gsap } from 'gsap';
	import { Draggable } from 'gsap/Draggable';
	import { onMount } from 'svelte';

	import { isStreetView } from '$routes/stores';
	import { mapStore } from '$routes/stores/map';
	import { isPc } from '$routes/map/utils/ui';

	gsap.registerPlugin(Draggable);

	let element = $state<HTMLDivElement | null>(null);
	// let rotation = $state<number>(0);

	// 回転値を -180° 〜 180° の範囲に正規化する関数
	const normalizeAngle = (angle: number): number => {
		return ((angle + 180) % 360) - 180;
	};

	mapStore.onRotate((bearing) => {
		if (!element || bearing == null) return;
		// rotation = bearing;
		if (!element) return;
		gsap.set(element, {
			rotation: bearing * -1
		});
	});

	onMount(() => {
		if (!element) return;
		Draggable.create(element, {
			type: 'rotation', // 回転モード
			inertia: true, // 慣性を有効化
			dragResistance: 0.5, // ドラッグ抵抗
			onDrag: function () {
				const rotation = normalizeAngle(this.rotation); // 回転値を正規化して保持
				mapStore.setBearing(rotation * -1);
			},
			onClick: function () {
				mapStore.easeTo({ bearing: 0 });
				// rotation = 0;
				if (element) {
					element.style.transform = `rotate(0deg)`;
				}
				this.rotation = 0;
				this.update();
			},
			onDragEnd: function () {
				const bearing = mapStore.getBearing();
				if (bearing && bearing >= -7 && bearing <= 7) {
					mapStore.easeTo({ bearing: 0 });
				}
			}
		});
	});
</script>

<!-- PC -->
<div class="absolute bottom-8 right-8">
	<div
		bind:this={element}
		class="border-3 grid h-[50px] w-[50px] shrink-0 cursor-grab place-items-center overflow-hidden rounded-full bg-black/50"
	>
		<svg
			class="scale-60 h-full w-full"
			xmlns="http://www.w3.org/2000/svg"
			width="132"
			height="132"
			viewBox="0 0 132 132"
		>
			<g transform="translate(47,0)">
				<path fill="#77D4AC" d="m19 0 16.455 66H2.545L19 0Z" />
				<path fill="#D9D9D9" d="M19 132 2.546 66h32.909L19 132Z" />
			</g>
		</svg>
	</div>
</div>

<style>
</style>
