<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

	import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
	import { threeJsManager } from '$routes/map/utils/three/layer-manager';
	import { closeModelView, type ModelViewCamera } from '$routes/stores';

	interface Props {
		entries: MeshEntry<MeshStyle>[];
		initialCamera?: ModelViewCamera;
		includeHighlights?: boolean;
	}

	let { entries, initialCamera, includeHighlights = false }: Props = $props();
	let canvas = $state<HTMLCanvasElement>();
	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);
	let resetView: () => void = () => {};
	let refreshStyle: () => void = () => {};

	interface ModelViewAnimation {
		entry: MeshEntry<MeshStyle>;
		mixer: THREE.AnimationMixer;
		actions: THREE.AnimationAction[];
		lastStateKey?: string;
		lastClipIndex?: number;
	}

	const close = () => {
		closeModelView();
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') close();
	};

	$effect(() => {
		entries.forEach((entry) => $state.snapshot(entry.style));
		refreshStyle();
	});

	const syncAnimation = (animation: ModelViewAnimation) => {
		const state = animation.entry.state?.animation;
		const clipIndex = Math.min(
			Math.max(state?.currentClipIndex ?? 0, 0),
			animation.actions.length - 1
		);
		const playing = state?.playing ?? false;
		const speed = Math.max(state?.speed ?? 1, 0);
		const stateKey = `${clipIndex}:${playing}:${speed}`;
		if (animation.lastStateKey === stateKey) return playing;

		animation.actions.forEach((action, index) => {
			if (index === clipIndex) {
				if (animation.lastClipIndex !== clipIndex) action.reset();
				action.enabled = true;
				action.setLoop(THREE.LoopRepeat, Infinity);
				action.clampWhenFinished = false;
				action.timeScale = speed;
				action.paused = !playing;
				action.play();
				return;
			}
			action.stop();
		});

		animation.lastStateKey = stateKey;
		animation.lastClipIndex = clipIndex;
		return playing;
	};

	onMount(() => {
		if (!canvas) return;
		const targetCanvas = canvas;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color('#101915');

		const camera: THREE.PerspectiveCamera | THREE.OrthographicCamera =
			initialCamera?.type === 'orthographic'
				? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1_000_000)
				: new THREE.PerspectiveCamera(45, 1, 0.01, 1_000_000);
		const renderer = new THREE.WebGLRenderer({ canvas: targetCanvas, antialias: true });
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1;

		const controls = new OrbitControls(camera, targetCanvas);
		controls.enableDamping = true;
		controls.dampingFactor = 0.08;
		controls.screenSpacePanning = true;

		scene.add(new THREE.HemisphereLight(0xeef3fb, 0x526554, 1.2));
		const keyLight = new THREE.DirectionalLight(0xfff5df, 2.2);
		keyLight.position.set(4, 6, 5);
		scene.add(keyLight);
		const fillLight = new THREE.DirectionalLight(0xb7d5ff, 0.55);
		fillLight.position.set(-4, 2, -3);
		scene.add(fillLight);

		const modelRecords = entries
			.map((entry) => ({
				entry,
				model: threeJsManager.createModelViewObject(entry, includeHighlights)
			}))
			.filter(
				(record): record is { entry: MeshEntry<MeshStyle>; model: THREE.Object3D } =>
					record.model !== null
			);
		if (modelRecords.length === 0) {
			errorMessage = 'モデルを地図に読み込んだ後に、もう一度開いてください。';
			isLoading = false;
			controls.dispose();
			renderer.dispose();
			return;
		}

		const modelRoot = new THREE.Group();
		modelRoot.add(...modelRecords.map((record) => record.model));
		scene.add(modelRoot);
		refreshStyle = () => {
			modelRecords.forEach(({ entry, model }) => {
				threeJsManager.updateModelViewStyle(model, entry);
			});
		};
		const animations = modelRecords.flatMap(({ entry, model }) => {
			const clips =
				(model as THREE.Object3D & { animations?: THREE.AnimationClip[] }).animations ?? [];
			if (clips.length === 0) return [];
			const mixer = new THREE.AnimationMixer(model);
			return [{ entry, mixer, actions: clips.map((clip) => mixer.clipAction(clip)) }];
		});
		modelRoot.updateWorldMatrix(true, true);
		const initialBounds = new THREE.Box3().setFromObject(modelRoot);
		if (initialBounds.isEmpty()) {
			errorMessage = '表示できるジオメトリがありません。';
			isLoading = false;
			controls.dispose();
			renderer.dispose();
			return;
		}
		const sourceCenter = initialBounds.getCenter(new THREE.Vector3());
		modelRoot.position.sub(sourceCenter);

		const fitModel = () => {
			modelRoot.updateWorldMatrix(true, true);
			const bounds = new THREE.Box3().setFromObject(modelRoot);
			const center = bounds.getCenter(new THREE.Vector3());
			const size = bounds.getSize(new THREE.Vector3());
			const largestDimension = Math.max(size.x, size.y, size.z, 1);
			const distance = largestDimension / (2 * Math.tan(THREE.MathUtils.degToRad(45 / 2)));

			camera.near = Math.max(largestDimension / 10_000, 0.001);
			camera.far = Math.max(largestDimension * 100, 1_000);
			if (camera instanceof THREE.PerspectiveCamera) {
				camera.fov = 45;
				camera.position.copy(center).add(new THREE.Vector3(distance, distance * 0.7, distance));
			} else {
				const halfSize = largestDimension * 0.65;
				camera.left = -halfSize;
				camera.right = halfSize;
				camera.top = halfSize;
				camera.bottom = -halfSize;
				camera.position.copy(center).add(new THREE.Vector3(distance, distance * 0.7, distance));
			}
			camera.updateProjectionMatrix();
			controls.target.copy(center);
			controls.maxDistance = largestDimension * 20;
			controls.update();
		};

		resetView = fitModel;
		fitModel();
		if (initialCamera) {
			const position = new THREE.Vector3(...initialCamera.position).sub(sourceCenter);
			const target = new THREE.Vector3(...initialCamera.position)
				.add(new THREE.Vector3(...initialCamera.direction))
				.sub(sourceCenter);
			camera.position.copy(position);
			camera.up.set(...initialCamera.up);
			if (camera instanceof THREE.PerspectiveCamera && initialCamera.fieldOfView) {
				camera.fov = initialCamera.fieldOfView;
			}
			if (camera instanceof THREE.OrthographicCamera && initialCamera.viewToWorldScale) {
				const halfScale = initialCamera.viewToWorldScale / 2;
				camera.top = halfScale;
				camera.bottom = -halfScale;
				camera.left = -halfScale;
				camera.right = halfScale;
			}
			camera.updateProjectionMatrix();
			controls.target.copy(target);
			controls.update();
		}
		isLoading = false;

		const resize = () => {
			const { clientWidth, clientHeight } = targetCanvas;
			if (clientWidth === 0 || clientHeight === 0) return;
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.setSize(clientWidth, clientHeight, false);
			if (camera instanceof THREE.PerspectiveCamera) {
				camera.aspect = clientWidth / clientHeight;
			} else {
				const centerX = (camera.left + camera.right) / 2;
				const halfHeight = (camera.top - camera.bottom) / 2;
				const halfWidth = halfHeight * (clientWidth / clientHeight);
				camera.left = centerX - halfWidth;
				camera.right = centerX + halfWidth;
			}
			camera.updateProjectionMatrix();
		};
		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(targetCanvas);
		resize();

		let lastAnimationTimeMs: number | null = null;
		renderer.setAnimationLoop((timeMs) => {
			const deltaSeconds =
				lastAnimationTimeMs == null ? 0 : Math.max((timeMs - lastAnimationTimeMs) / 1_000, 0);
			lastAnimationTimeMs = timeMs;
			animations.forEach((animation) => {
				if (syncAnimation(animation)) animation.mixer.update(deltaSeconds);
			});
			controls.update();
			renderer.render(scene, camera);
		});

		return () => {
			refreshStyle = () => {};
			resizeObserver.disconnect();
			renderer.setAnimationLoop(null);
			animations.forEach(({ mixer }) => mixer.stopAllAction());
			controls.dispose();
			scene.remove(modelRoot);
			renderer.dispose();
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<section
	class="fixed inset-0 z-0 overflow-hidden bg-[#101915] text-white"
	aria-label="3Dモデルビュー"
>
	<canvas bind:this={canvas} class="h-full w-full touch-none"></canvas>

	<div class="pointer-events-none absolute top-0 p-3 lg:p-5 right-0">
		<button
			class="pointer-events-auto grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-white/15 bg-black/65 text-white shadow-2xl backdrop-blur hover:bg-white/15"
			onclick={() => resetView()}
			aria-label="表示を初期位置に戻す"
			title="表示を戻す"
		>
			<Icon icon="mdi:fit-to-screen-outline" class="h-6 w-6" />
		</button>
	</div>

	<div class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
		<p class="rounded-full bg-black/65 px-4 py-2 text-xs text-white/70 backdrop-blur">
			ドラッグで回転、ホイールまたはピンチで拡大縮小
		</p>
	</div>

	{#if isLoading || errorMessage}
		<div class="absolute inset-0 grid place-items-center bg-[#101915]/80 p-6 text-center">
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
