<script lang="ts">
	import { onMount } from 'svelte';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

	import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
	import {
		threeJsManager,
		type PickedModelFeature,
		type ModelViewSession
	} from '$routes/map/utils/three/layer-manager';
	import { closeModelView, type ModelViewCamera } from '$routes/stores';

	interface Props {
		entries: MeshEntry<MeshStyle>[];
		initialCamera?: ModelViewCamera;
		includeHighlights?: boolean;
		fpsMode?: boolean;
		onModelPicked?: (picked: PickedModelFeature) => void;
		onResetViewChange?: (resetView: (() => void) | null) => void;
		onFpsModeChange?: (enabled: boolean) => void;
	}

	let {
		entries,
		initialCamera,
		includeHighlights = false,
		fpsMode = false,
		onModelPicked,
		onResetViewChange,
		onFpsModeChange
	}: Props = $props();
	let interactionTarget = $state<HTMLButtonElement>();
	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);
	const MODEL_VIEW_BACKGROUND =
		'radial-gradient(circle at 50% 44%, rgba(150, 175, 178, 0.62) 0%, rgba(213, 226, 227, 0.78) 30%, transparent 62%), linear-gradient(145deg, #ffffff 0%, #edf3f4 54%, #dce7e8 100%)';
	let setFpsMode = (_enabled: boolean) => {};
	let handleFpsKeyDown = (_event: KeyboardEvent) => false;
	let handleFpsKeyUp = (_event: KeyboardEvent) => {};

	const close = () => {
		closeModelView();
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (handleFpsKeyDown(event)) return;
		if (event.key === 'Escape') close();
	};
	const onKeyup = (event: KeyboardEvent) => {
		handleFpsKeyUp(event);
	};

	let pointerDownPosition: { x: number; y: number } | null = null;
	const onPointerDown = (event: PointerEvent) => {
		if (event.button === 0) pointerDownPosition = { x: event.clientX, y: event.clientY };
	};
	const onModelClick = async (event: MouseEvent) => {
		if (fpsMode) return;
		const pointerDown = pointerDownPosition;
		pointerDownPosition = null;
		if (
			!pointerDown ||
			Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 4
		) {
			return;
		}
		const picked = await threeJsManager.pickModelInActiveView({
			clientX: event.clientX,
			clientY: event.clientY
		});
		if (picked) {
			onModelPicked?.(picked);
			threeJsManager.requestModelViewRepaint();
		}
	};
	onMount(() => {
		if (!interactionTarget) return;
		const target = interactionTarget;
		const session: ModelViewSession | null = threeJsManager.openModelView(
			entries.map((entry) => entry.id),
			initialCamera,
			includeHighlights
		);
		if (!session) {
			errorMessage = 'モデルを地図に読み込んだ後に、もう一度開いてください。';
			isLoading = false;
			return;
		}
		const originalCanvasBackground = session.canvas.style.background;
		session.canvas.style.background = MODEL_VIEW_BACKGROUND;

		const controls = new OrbitControls(session.camera, target);
		controls.enableDamping = true;
		controls.dampingFactor = 0.08;
		controls.enablePan = true;
		controls.enableZoom = false;
		controls.screenSpacePanning = true;
		const zoomControls = new TrackballControls(session.camera, target);
		zoomControls.noPan = true;
		zoomControls.noRotate = true;
		zoomControls.zoomSpeed = 0.2;
		const pointerLockControls = new PointerLockControls(session.camera, target);
		const pressedKeys = new Set<string>();
		let fpsModeEnabled = false;
		setFpsMode = (enabled) => {
			fpsModeEnabled = enabled;
			controls.enabled = !enabled;
			zoomControls.enabled = !enabled;
			pressedKeys.clear();
			if (!enabled && pointerLockControls.isLocked) pointerLockControls.unlock();
		};
		setFpsMode(fpsMode);
		handleFpsKeyDown = (event) => {
			if (event.key === 'Escape' && fpsModeEnabled) {
				setFpsMode(false);
				onFpsModeChange?.(false);
				return true;
			}
			if (!fpsModeEnabled || !pointerLockControls.isLocked) return false;
			if (
				!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'].includes(event.code)
			) {
				return false;
			}
			event.preventDefault();
			pressedKeys.add(event.code);
			return true;
		};
		handleFpsKeyUp = (event) => {
			pressedKeys.delete(event.code);
		};
		const lockPointer = () => {
			if (fpsModeEnabled && !pointerLockControls.isLocked) pointerLockControls.lock();
		};
		const unlockPointer = () => {
			pressedKeys.clear();
			if (fpsModeEnabled) onFpsModeChange?.(false);
		};
		target.addEventListener('click', lockPointer);
		pointerLockControls.addEventListener('unlock', unlockPointer);
		const syncControls = () => {
			const target = session.getTarget();
			controls.target.copy(target);
			zoomControls.target.copy(target);
			controls.update();
			zoomControls.update();
		};
		const resetView = () => {
			session.resetView();
			syncControls();
			threeJsManager.requestModelViewRepaint();
		};
		onResetViewChange?.(resetView);
		syncControls();
		isLoading = false;

		const resizeObserver = new ResizeObserver(() => {
			session.resize();
			zoomControls.handleResize();
			threeJsManager.requestModelViewRepaint();
		});
		resizeObserver.observe(target);

		let animationFrame = 0;
		let previousFrameTime = performance.now();
		const renderFrame = (timeMs: number) => {
			const deltaSeconds = Math.min(Math.max((timeMs - previousFrameTime) / 1_000, 0), 0.1);
			previousFrameTime = timeMs;
			if (!fpsModeEnabled) {
				controls.update();
				zoomControls.target.copy(controls.target);
				zoomControls.update();
			}
			if (fpsModeEnabled && pointerLockControls.isLocked) {
				const distance = session.movementSpeed * deltaSeconds;
				if (pressedKeys.has('KeyW')) pointerLockControls.moveForward(distance);
				if (pressedKeys.has('KeyS')) pointerLockControls.moveForward(-distance);
				if (pressedKeys.has('KeyA')) pointerLockControls.moveRight(-distance);
				if (pressedKeys.has('KeyD')) pointerLockControls.moveRight(distance);
				if (pressedKeys.has('Space')) session.camera.position.y += distance;
				if (pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight')) {
					session.camera.position.y -= distance;
				}
			}
			threeJsManager.requestModelViewRepaint();
			animationFrame = requestAnimationFrame(renderFrame);
		};
		animationFrame = requestAnimationFrame(renderFrame);

		return () => {
			resizeObserver.disconnect();
			cancelAnimationFrame(animationFrame);
			target.removeEventListener('click', lockPointer);
			pointerLockControls.removeEventListener('unlock', unlockPointer);
			controls.dispose();
			zoomControls.dispose();
			if (pointerLockControls.isLocked) pointerLockControls.unlock();
			pointerLockControls.dispose();
			session.canvas.style.background = originalCanvasBackground;
			onResetViewChange?.(null);
			onFpsModeChange?.(false);
			setFpsMode = () => {};
			handleFpsKeyDown = () => false;
			handleFpsKeyUp = () => {};
			threeJsManager.closeModelView();
		};
	});

	$effect(() => {
		setFpsMode(fpsMode);
	});
</script>

<svelte:window onkeydown={onKeydown} onkeyup={onKeyup} />

<section
	class="pointer-events-none fixed inset-0 z-0 overflow-hidden text-white"
	aria-label="3Dモデルビュー"
>
	<button
		type="button"
		bind:this={interactionTarget}
		class="pointer-events-auto absolute inset-0 cursor-pointer border-0 bg-transparent p-0 touch-none"
		aria-label="3Dモデル操作領域"
		onpointerdown={onPointerDown}
		onclick={onModelClick}
	></button>

	<div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
		<p class="rounded-full bg-black/65 px-4 py-2 text-xs text-white/70 backdrop-blur">
			ドラッグで回転、右ドラッグで移動、ホイールまたはピンチで拡大縮小
		</p>
	</div>

	{#if isLoading || errorMessage}
		<div
			class="pointer-events-auto absolute inset-0 z-20 grid place-items-center bg-[#101915]/80 p-6 text-center"
		>
			<div
				class="max-w-sm rounded-2xl border border-white/15 bg-black/65 px-6 py-5 shadow-2xl backdrop-blur"
			>
				{#if isLoading}
					<p>モデルを準備しています</p>
				{:else}
					<p>{errorMessage}</p>
					<button class="mt-4 cursor-pointer text-sm text-[#bfe7d0] underline" onclick={close}
						>閉じる</button
					>
				{/if}
			</div>
		</div>
	{/if}
</section>
