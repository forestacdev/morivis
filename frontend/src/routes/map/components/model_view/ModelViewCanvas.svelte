<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
	onModelPicked?: (picked: PickedModelFeature) => void;
}

let { entries, initialCamera, includeHighlights = false, onModelPicked }: Props = $props();
let interactionTarget = $state<HTMLButtonElement>();
	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);
	let resetView: () => void = () => {};

	const close = () => {
		closeModelView();
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') close();
	};

	let pointerDownPosition: { x: number; y: number } | null = null;
	const onPointerDown = (event: PointerEvent) => {
		if (event.button === 0) pointerDownPosition = { x: event.clientX, y: event.clientY };
	};
	const onModelClick = async (event: MouseEvent) => {
		const pointerDown = pointerDownPosition;
		pointerDownPosition = null;
		if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 4) {
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

		const controls = new OrbitControls(session.camera, interactionTarget);
		controls.enableDamping = true;
		controls.dampingFactor = 0.08;
		controls.screenSpacePanning = true;
		const syncControls = () => {
			controls.target.copy(session.getTarget());
			controls.update();
		};
		resetView = () => {
			session.resetView();
			syncControls();
			threeJsManager.requestModelViewRepaint();
		};
		syncControls();
		isLoading = false;

		const resizeObserver = new ResizeObserver(() => {
			session.resize();
			threeJsManager.requestModelViewRepaint();
		});
		resizeObserver.observe(interactionTarget);

		let animationFrame = 0;
		const renderFrame = () => {
			controls.update();
			threeJsManager.requestModelViewRepaint();
			animationFrame = requestAnimationFrame(renderFrame);
		};
		renderFrame();

		return () => {
			resizeObserver.disconnect();
			cancelAnimationFrame(animationFrame);
			controls.dispose();
			threeJsManager.closeModelView();
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

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

	<div class="pointer-events-none absolute top-0 right-0 z-10 p-3 lg:p-5">
		<button
			class="pointer-events-auto grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-white/15 bg-black/65 text-white shadow-2xl backdrop-blur hover:bg-white/15"
			onclick={() => resetView()}
			aria-label="表示を初期位置に戻す"
			title="表示を戻す"
		>
			<Icon icon="mdi:fit-to-screen-outline" class="h-6 w-6" />
		</button>
	</div>

	<div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
		<p class="rounded-full bg-black/65 px-4 py-2 text-xs text-white/70 backdrop-blur">
			ドラッグで回転、ホイールまたはピンチで拡大縮小
		</p>
	</div>

	{#if isLoading || errorMessage}
		<div class="pointer-events-auto absolute inset-0 z-20 grid place-items-center bg-[#101915]/80 p-6 text-center">
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
