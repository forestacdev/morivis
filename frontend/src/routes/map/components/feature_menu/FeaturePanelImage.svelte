<script lang="ts">
	import { fade } from 'svelte/transition';
	import Viewer from 'viewerjs';

	import 'viewerjs/dist/viewer.css';
	import type { FeaturePanelImage } from '$routes/map/types';

	interface Props {
		image: FeaturePanelImage | null;
	}

	let { image }: Props = $props();

	let imageViewerRoot: HTMLDivElement | null = $state(null);
	let imageViewerImage: HTMLImageElement | null = $state(null);
	let isImageViewerOpen = $state(false);
	let imageViewer: Viewer | null = null;

	let objectFitClass = $derived(image?.fit === 'cover' ? 'object-cover' : 'object-contain');

	const openImageViewer = () => {
		if (!imageViewerRoot) return;

		if (!imageViewer) {
			imageViewer = new Viewer(imageViewerRoot, {
				backdrop: true,
				button: true,
				navbar: false,
				title: false,
				shown: () => {
					isImageViewerOpen = true;
				},
				hidden: () => {
					isImageViewerOpen = false;
				},
				toolbar: {
					zoomIn: true,
					zoomOut: true,
					oneToOne: true,
					reset: true,
					prev: false,
					play: false,
					next: false,
					rotateLeft: true,
					rotateRight: true,
					flipHorizontal: false,
					flipVertical: false
				}
			});
		}

		imageViewer.show();
	};

	$effect(() => {
		void imageViewerRoot;
		void imageViewerImage;
		void image?.url;

		return () => {
			isImageViewerOpen = false;
			imageViewer?.destroy();
			imageViewer = null;
		};
	});
</script>

{#if image}
	<div class="w-full">
		<div
			bind:this={imageViewerRoot}
			class="relative aspect-video w-full overflow-hidden rounded-lg bg-black"
		>
			{#key image.url}
				{#await new Promise((resolve) => {
					const img = new Image();
					img.onload = () => resolve(img);
					img.src = image.url;
				}) then}
					<button
						type="button"
						class="absolute inset-0 h-full w-full cursor-zoom-in"
						aria-label="画像を拡大表示"
						onclick={openImageViewer}
					>
						<img
							bind:this={imageViewerImage}
							in:fade
							class="c-no-drag-icon absolute inset-0 h-full w-full {objectFitClass}"
							alt={image.alt}
							src={image.url}
						/>
					</button>
				{/await}
			{/key}
		</div>

		{#if image.credit || image.licenseName || image.linkUrl}
			<div class="mt-1 text-xs text-gray-400">
				{#if image.credit}
					<span>{image.credit}</span>
				{/if}
				{#if image.licenseName}
					{#if image.credit}
						<span class="mx-1">/</span>
					{/if}
					{#if image.licenseUrl}
						<a
							href={image.licenseUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-accent hover:underline"
						>
							{image.licenseName}
						</a>
					{:else}
						<span>{image.licenseName}</span>
					{/if}
				{/if}
				{#if image.linkUrl}
					<span class="ml-1">via</span>
					<a
						href={image.linkUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-accent ml-1 hover:underline"
					>
						{image.source === 'inaturalist'
							? 'iNaturalist'
							: image.source === 'wikipedia'
								? 'Wikipedia'
								: 'リンク'}
					</a>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	:global(.viewer-button) {
		top: 24px;
		right: 24px;
		width: 64px;
		height: 64px;
	}

	:global(.viewer-canvas) {
		background-color: rgba(0, 0, 0, 0.5);
	}

	:global(.viewer-button.viewer-close) {
		width: 48px;
		height: 48px;
	}
</style>
