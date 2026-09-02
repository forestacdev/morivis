<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

	import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
	import { threeJsManager } from '$routes/map/utils/three/layer-manager';
	import { closeModelView } from '$routes/stores';

	interface Props {
		entry: MeshEntry<MeshStyle>;
	}

	let { entry }: Props = $props();
	let canvas = $state<HTMLCanvasElement>();
	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);
	let resetView: () => void = () => {};

	const close = () => {
		closeModelView();
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') close();
	};

	onMount(() => {
		if (!canvas) return;
		const targetCanvas = canvas;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color('#101915');

		const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1_000_000);
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

		const model = threeJsManager.createModelViewObject(entry.id);
		if (!model) {
			errorMessage = 'モデルを地図に読み込んだ後に、もう一度開いてください。';
			isLoading = false;
			controls.dispose();
			renderer.dispose();
			return;
		}

		const modelRoot = new THREE.Group();
		modelRoot.add(model);
		scene.add(modelRoot);
		modelRoot.updateWorldMatrix(true, true);
		const initialBounds = new THREE.Box3().setFromObject(modelRoot);
		if (initialBounds.isEmpty()) {
			errorMessage = '表示できるジオメトリがありません。';
			isLoading = false;
			controls.dispose();
			renderer.dispose();
			return;
		}
		modelRoot.position.sub(initialBounds.getCenter(new THREE.Vector3()));

		const fitModel = () => {
			modelRoot.updateWorldMatrix(true, true);
			const bounds = new THREE.Box3().setFromObject(modelRoot);
			const center = bounds.getCenter(new THREE.Vector3());
			const size = bounds.getSize(new THREE.Vector3());
			const largestDimension = Math.max(size.x, size.y, size.z, 1);
			const distance = largestDimension / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

			camera.near = Math.max(largestDimension / 10_000, 0.001);
			camera.far = Math.max(largestDimension * 100, 1_000);
			camera.position.copy(center).add(new THREE.Vector3(distance, distance * 0.7, distance));
			camera.updateProjectionMatrix();
			controls.target.copy(center);
			controls.maxDistance = largestDimension * 20;
			controls.update();
		};

		resetView = fitModel;
		fitModel();
		isLoading = false;

		const resize = () => {
			const { clientWidth, clientHeight } = targetCanvas;
			if (clientWidth === 0 || clientHeight === 0) return;
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.setSize(clientWidth, clientHeight, false);
			camera.aspect = clientWidth / clientHeight;
			camera.updateProjectionMatrix();
		};
		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(targetCanvas);
		resize();

		renderer.setAnimationLoop(() => {
			controls.update();
			renderer.render(scene, camera);
		});

		return () => {
			resizeObserver.disconnect();
			renderer.setAnimationLoop(null);
			controls.dispose();
			scene.remove(modelRoot);
			renderer.dispose();
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<section
	class="fixed inset-0 z-50 overflow-hidden bg-[#101915] text-white"
	aria-label="3Dモデルビュー"
>
	<canvas bind:this={canvas} class="h-full w-full touch-none"></canvas>

	<div
		class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 lg:p-5"
	>
		<div
			class="pointer-events-auto flex max-w-[min(34rem,calc(100vw-8rem))] items-center gap-2 rounded-xl border border-white/15 bg-black/65 px-2 py-2 shadow-2xl backdrop-blur"
		>
			<button
				class="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg text-white hover:bg-white/15"
				onclick={close}
				aria-label="モデルビューを閉じる"
				title="閉じる"
			>
				<Icon icon="ep:back" class="h-6 w-6" />
			</button>
			<div class="min-w-0 pr-2">
				<p class="truncate text-sm text-white/60">3Dモデルビュー</p>
				<h1 class="truncate text-base font-medium">{entry.metaData.name}</h1>
			</div>
		</div>

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
