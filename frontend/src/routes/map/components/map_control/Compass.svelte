<script lang="ts">
	import Icon from '@iconify/svelte';
	import { gsap } from 'gsap';
	import { Draggable } from 'gsap/Draggable';
	import { onMount } from 'svelte';

	import { ICONS, getVisibilityIconName } from '$lib/icons';
	import { mapStore } from '$routes/stores/map';

	gsap.registerPlugin(Draggable);

	let element = $state<HTMLDivElement | null>(null);
	let needle = $state<SVGSVGElement | null>(null);

	// 回転値を -180° 〜 180° の範囲に正規化する関数
	const normalizeAngle = (angle: number): number => {
		return ((angle + 180) % 360) - 180;
	};

	// 針の傾きを更新
	// 円枠がbearingで回転するので、針は親の回転を打ち消してからピッチだけかける
	const updateNeedle = () => {
		const pitch = mapStore.getPitch() ?? 0;
		const bearing = mapStore.getBearing() ?? 0;
		if (needle) {
			// 親(element)の回転を打ち消し → ピッチで傾け → 元の回転を再適用
			needle.style.transform = `rotateZ(${bearing}deg) rotateX(${pitch * 0.7}deg) rotateZ(${bearing * -1}deg)`;
		}
	};

	let orbitA = $state<HTMLButtonElement | null>(null);
	let orbitB = $state<HTMLButtonElement | null>(null);
	let isHover = $state(false);
	let showOrbitButtons = $state(false);

	const orbitTimelines: gsap.core.Timeline[] = [];
	let orbitTweenA: gsap.core.Tween | null = null;
	let orbitTweenB: gsap.core.Tween | null = null;
	const ORBIT_RADIUS = 40;
	const ORBIT_REST_PROGRESS = 0.75;
	const BASE_SPEED = 0.3; // 基本速度（ズームしていないときの速度）
	const MAX_SPEED = 10; // 最大速度（ズーム速度に応じてこれ以上速くならないようにするための上限）
	const SPEED_MULTIPLIER = 3; // ズーム速度に対する加速の強さ
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

	// パン・ピッチ・回転の速度検出（RAFループで統合）
	let moveRAF: number | null = null;
	let isMoving = false;
	let prevState: { lng: number; lat: number; pitch: number; bearing: number } | null = null;
	let prevMoveTime = 0;

	const trackMove = () => {
		const center = mapStore.getCenter();
		const pitch = mapStore.getPitch() ?? 0;
		const bearing = mapStore.getBearing() ?? 0;
		const now = performance.now();

		if (center && prevState && now - prevMoveTime > 0) {
			const dt = (now - prevMoveTime) / 1000;

			// パン速度（経緯度差分）
			const dlng = (center.lng - prevState.lng) * 1000;
			const dlat = (center.lat - prevState.lat) * 1000;
			const panSpeed = Math.sqrt(dlng * dlng + dlat * dlat) / dt;

			// ピッチ速度（度/秒）
			const pitchSpeed = Math.abs(pitch - prevState.pitch) / dt;

			// 回転速度（度/秒）
			const bearingSpeed = Math.abs(bearing - prevState.bearing) / dt;

			// 各操作の寄与を合算
			const combined = panSpeed * 0.02 + pitchSpeed * 0.05 + bearingSpeed * 0.03;
			const target = Math.min(BASE_SPEED + combined, MAX_SPEED);

			if (target > speedProxy.value) {
				tweenSpeed(target, 0.3, 'power2.out');
			}
		}

		prevState = center ? { lng: center.lng, lat: center.lat, pitch, bearing } : null;
		prevMoveTime = now;

		updateNeedle();
		if (isMoving) {
			moveRAF = requestAnimationFrame(trackMove);
		}
	};

	const expandOrbitButtons = () => {
		showOrbitButtons = true;
		orbitTimelines.forEach((tl) => tl.pause());
		if (orbitA) {
			orbitTweenA?.kill();
			orbitTweenA = gsap.to(orbitA, {
				x: 0,
				y: -ORBIT_RADIUS,
				width: 34,
				height: 34,
				opacity: 1,
				duration: 0.35,
				ease: 'power2.out'
			});
		}
		if (orbitB) {
			orbitTweenB?.kill();
			orbitTweenB = gsap.to(orbitB, {
				x: 0,
				y: ORBIT_RADIUS,
				width: 34,
				height: 34,
				opacity: 1,
				duration: 0.35,
				ease: 'power2.out'
			});
		}
	};

	const collapseOrbitButtons = () => {
		showOrbitButtons = false;
		orbitTweenA?.kill();
		orbitTweenB?.kill();
		orbitTimelines.forEach((tl) => tl.progress(ORBIT_REST_PROGRESS).play());
		if (orbitA) {
			orbitTweenA = gsap.to(orbitA, {
				width: 8,
				height: 8,
				opacity: 0.7,
				duration: 0.35,
				ease: 'power2.out'
			});
		}
		if (orbitB) {
			orbitTweenB = gsap.to(orbitB, {
				width: 8,
				height: 8,
				opacity: 0.4,
				duration: 0.35,
				ease: 'power2.out'
			});
		}
	};

	const resetBearing = () => {
		mapStore.easeTo({ bearing: 0 });
	};

	const resetPitch = () => {
		mapStore.easeTo({ pitch: 0 });
	};

	const downPitch = () => {
		const current = mapStore.getPitch() ?? 0;
		mapStore.easeTo({ pitch: Math.min(current + 15, 85) });
	};

	const upPitch = () => {
		const current = mapStore.getPitch() ?? 0;
		mapStore.easeTo({ pitch: Math.max(current - 15, 0) });
	};

	$effect(() => {
		if (isHover) {
			expandOrbitButtons();
			return;
		}
		collapseOrbitButtons();
	});

	onMount(() => {
		if (!element) return;
		const bearing = mapStore.getBearing() ?? 0;
		gsap.set(element, { rotation: bearing * -1 });
		updateNeedle();

		const unsubscribeRotate = mapStore.onRotate((bearing) => {
			if (bearing == null) return;
			if (element) gsap.set(element, { rotation: bearing * -1 });
			updateNeedle();
		});

		const unsubscribeZoom = mapStore.onZoom((zoom) => {
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

		const unsubscribeMoveStart = mapStore.onMoveStart(() => {
			isMoving = true;
			prevState = null;
			prevMoveTime = performance.now();
			if (moveRAF) cancelAnimationFrame(moveRAF);
			moveRAF = requestAnimationFrame(trackMove);
		});

		const unsubscribeMoveEnd = mapStore.onMoveEnd(() => {
			isMoving = false;
			if (moveRAF) {
				cancelAnimationFrame(moveRAF);
				moveRAF = null;
			}
			if (speedProxy.value <= BASE_SPEED) return;
			tweenSpeed(BASE_SPEED, 1.5, 'power3.out');
		});

		// 2つの小さい円の周回アニメーション
		if (orbitA && orbitB) {
			const duration = 6;

			const animate = (el: HTMLButtonElement, startAngle: number) => {
				const orbitState = { angle: startAngle };
				const tl = gsap.timeline({ repeat: -1 });
				tl.fromTo(
					orbitState,
					{ angle: startAngle },
					{
						angle: startAngle + 360,
						duration,
						ease: 'none',
						onUpdate: () => {
							const angle = orbitState.angle * (Math.PI / 180);
							const x = Math.cos(angle) * ORBIT_RADIUS;
							const y = Math.sin(angle) * ORBIT_RADIUS;
							gsap.set(el, { x, y });
						}
					}
				);
				orbitTimelines.push(tl);
			};

			animate(orbitA, 0);
			animate(orbitB, 180);
		}

		const draggable = Draggable.create(element, {
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

		return () => {
			unsubscribeRotate();
			unsubscribeZoom();
			unsubscribeMoveStart();
			unsubscribeMoveEnd();
			isMoving = false;
			if (moveRAF) cancelAnimationFrame(moveRAF);
			moveRAF = null;
			prevState = null;
			prevZoom = null;
			prevTime = 0;
			prevMoveTime = 0;
			speedProxy.value = BASE_SPEED;
			speedTween?.kill();
			speedTween = null;
			orbitTweenA?.kill();
			orbitTweenA = null;
			orbitTweenB?.kill();
			orbitTweenB = null;
			orbitTimelines.forEach((tl) => tl.kill());
			orbitTimelines.length = 0;
			draggable[0]?.kill();
			gsap.killTweensOf([element, needle, orbitA, orbitB].filter(Boolean));
		};
	});
</script>

<!-- PC -->

<div
	class="relative grid h-[90px] w-[90px] place-items-center"
	role="group"
	aria-label="コンパスコントロール"
	onmouseenter={() => (isHover = true)}
	onmouseleave={() => (isHover = false)}
>
	<!-- 周回する小さい円 -->
	<button
		type="button"
		bind:this={orbitA}
		class="absolute grid cursor-pointer rounded-full border border-white/30 text-[10px] font-semibold text-black shadow-[0_0_18px_rgba(0,0,0,0.28)] transition-[box-shadow,border-color,background-color,color] duration-200
			{showOrbitButtons
			? 'bg-base pointer-events-auto place-items-center border-white/50'
			: 'bg-base/70 pointer-events-none'}"
		style="width: 8px; height: 8px;"
		aria-label="傾ける"
		disabled={!showOrbitButtons}
		onclick={downPitch}
	>
		{#if showOrbitButtons}<Icon icon={ICONS.arrowUp} class="h-6 w-6 -translate-y-0.5" />{/if}
	</button>
	<button
		type="button"
		bind:this={orbitB}
		class="absolute grid cursor-pointer rounded-full border border-white/20 text-[9px] font-semibold text-black shadow-[0_0_18px_rgba(0,0,0,0.24)] transition-[box-shadow,border-color,background-color,color] duration-200
			{showOrbitButtons
			? 'bg-base pointer-events-auto place-items-center border-white/40'
			: 'bg-base/70 pointer-events-none'}"
		style="width: 8px; height: 8px;"
		aria-label="傾きを戻す"
		disabled={!showOrbitButtons}
		onclick={upPitch}
	>
		{#if showOrbitButtons}<Icon icon={ICONS.arrowDown} class="h-6 w-6 translate-y-0.5" />{/if}
	</button>
	<!-- コンパス本体 -->
	<div
		bind:this={element}
		class="pointer-events-auto grid h-[65px] w-[65px] shrink-0 cursor-grab place-items-center overflow-hidden rounded-full border-3 transition-colors duration-150 {isHover
			? 'bg-black'
			: 'bg-black/60 backdrop-blur-[1px]'}"
		style="perspective: 200px;"
	>
		<svg
			bind:this={needle}
			class="h-[42px] w-[42px]"
			style="transform-style: preserve-3d;"
			xmlns="http://www.w3.org/2000/svg"
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
