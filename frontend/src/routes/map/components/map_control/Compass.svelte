<script lang="ts">
	import { gsap } from 'gsap';
	import { Draggable } from 'gsap/Draggable';
	import { onMount } from 'svelte';

	import { mapStore } from '$routes/stores/map';

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

	let orbitA = $state<HTMLDivElement | null>(null);
	let orbitB = $state<HTMLDivElement | null>(null);

	const orbitTimelines: gsap.core.Timeline[] = [];
	const BASE_SPEED = 0.5; // 基本速度（ズームしていないときの速度）
	const MAX_SPEED = 15; // 最大速度（ズーム速度に応じてこれ以上速くならないようにするための上限）
	const SPEED_MULTIPLIER = 4; // ズーム速度に対する加速の強さ
	let speedTween: gsap.core.Tween | null = null;
	const speedProxy = { value: BASE_SPEED }; // tweenで補間する現在速度
	let prevZoom: number | null = null;
	let prevTime = 0;

	// 目標速度にtweenでなめらかに遷移
	const tweenSpeed = (target: number, duration: number, ease: string) => {
		if (speedTween) speedTween.kill();
		speedTween = gsap.to(speedProxy, {
			value: target,
			duration,
			ease,
			onUpdate: () => {
				orbitTimelines.forEach((tl) => tl.timeScale(speedProxy.value));
			}
		});
	};

	// ズーム速度に応じて加速
	mapStore.onZoom((zoom) => {
		if (zoom == null) return;
		const now = performance.now();
		if (prevZoom !== null && now - prevTime > 0) {
			const dt = (now - prevTime) / 1000;
			const zoomSpeed = Math.abs(zoom - prevZoom) / dt;
			const target = Math.min(BASE_SPEED + zoomSpeed * SPEED_MULTIPLIER, MAX_SPEED);
			tweenSpeed(target, 0.3, 'power2.out'); // 加速: 0.3秒でなめらかに
		}
		prevZoom = zoom;
		prevTime = now;
	});

	// パン（地図移動）速度の検出
	let panRAF: number | null = null;
	let prevCenter: { lng: number; lat: number } | null = null;
	let prevPanTime = 0;
	let isPanning = false;

	const trackPan = () => {
		const center = mapStore.getCenter();
		const now = performance.now();
		if (center && prevCenter && now - prevPanTime > 0) {
			const dt = (now - prevPanTime) / 1000;
			// 経緯度の差分からピクセル的な移動速度を概算
			const dlng = (center.lng - prevCenter.lng) * 1000;
			const dlat = (center.lat - prevCenter.lat) * 1000;
			const dist = Math.sqrt(dlng * dlng + dlat * dlat);
			const panSpeed = dist / dt;
			const target = Math.min(BASE_SPEED + panSpeed * 0.02, MAX_SPEED);
			if (target > speedProxy.value) {
				tweenSpeed(target, 0.3, 'power2.out');
			}
		}
		prevCenter = center ? { lng: center.lng, lat: center.lat } : null;
		prevPanTime = now;
		if (isPanning) {
			panRAF = requestAnimationFrame(trackPan);
		}
	};

	mapStore.onMoveStart(() => {
		isPanning = true;
		prevCenter = null;
		prevPanTime = performance.now();
		panRAF = requestAnimationFrame(trackPan);
	});

	// 移動終了 → ゆっくり元に戻る
	mapStore.onMoveEnd(() => {
		isPanning = false;
		if (panRAF) {
			cancelAnimationFrame(panRAF);
			panRAF = null;
		}
		if (speedProxy.value <= BASE_SPEED) return;
		tweenSpeed(BASE_SPEED, 1.5, 'power3.out');
	});

	onMount(() => {
		if (!element) return;

		// 2つの小さい円の周回アニメーション
		if (orbitA && orbitB) {
			const radius = 43;
			const duration = 6;

			const animate = (el: HTMLDivElement, startAngle: number) => {
				const tl = gsap.timeline({ repeat: -1 });
				tl.fromTo(
					el,
					{ rotation: startAngle },
					{
						rotation: startAngle + 360,
						duration,
						ease: 'none',
						onUpdate: function () {
							const angle = (this.progress() * 360 + startAngle) * (Math.PI / 180);
							const x = Math.cos(angle) * radius;
							const y = Math.sin(angle) * radius;
							gsap.set(el, { x, y });
						}
					}
				);
				orbitTimelines.push(tl);
			};

			animate(orbitA, 0);
			animate(orbitB, 180);
		}

		Draggable.create(element, {
			type: 'rotation', // 回転モード
			inertia: true, // 慣性を有効化
			dragResistance: 0.5, // ドラッグ抵抗
			onDrag: function () {
				const rotation = normalizeAngle(this.rotation); // 回転値を正規化して保持
				mapStore.setBearing(rotation * -1);
			},
			onClick: function () {
				mapStore.easeTo({ bearing: 0, pitch: 0 });
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

<div class="relative grid h-[70px] w-[70px] place-items-center">
	<!-- 周回する小さい円 -->
	<div
		bind:this={orbitA}
		class="pointer-events-none absolute h-2 w-2 rounded-full bg-white/70"
	></div>
	<div
		bind:this={orbitB}
		class="pointer-events-none absolute h-2 w-2 rounded-full bg-white/40"
	></div>
	<!-- コンパス本体 -->
	<div
		bind:this={element}
		class="pointer-events-auto grid h-[70px] w-[70px] shrink-0 cursor-grab place-items-center overflow-hidden rounded-full border-3 bg-black/50"
	>
		<svg
			class="h-full w-full scale-60"
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
