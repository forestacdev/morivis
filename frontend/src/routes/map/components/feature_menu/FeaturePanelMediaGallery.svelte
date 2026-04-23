<script lang="ts">
	import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { fade } from 'svelte/transition';
	import Viewer from 'viewerjs';

	import 'viewerjs/dist/viewer.css';
	import type { FeaturePanelImageMedia, FeaturePanelMedia } from '$routes/map/types';

	interface Props {
		media: FeaturePanelMedia[];
	}

	let { media }: Props = $props();

	let emblaMainCarousel: EmblaCarouselType | undefined = $state();
	let emblaMainCarouselOptions: EmblaOptionsType = $derived({
		loop: media.length > 1,
		dragFree: false
	});
	let emblaMainCarouselPlugins: EmblaPluginType[] = [];

	let imageViewerRoot: HTMLDivElement | null = $state(null);
	let imageViewerImage: HTMLImageElement | null = $state(null);
	let isImageViewerOpen = $state(false);
	let imageViewer: Viewer | null = null;

	const onInitEmblaMainCarousel = (event: CustomEvent<EmblaCarouselType>) => {
		emblaMainCarousel = event.detail;
	};

	const objectFitClass = (item: FeaturePanelImageMedia) => {
		return item.fit === 'cover' ? 'object-cover' : 'object-contain';
	};

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

	const sourceLabel = (item: FeaturePanelImageMedia) => {
		if (item.source === 'inaturalist') return 'iNaturalist';
		if (item.source === 'wikipedia') return 'Wikipedia';
		return 'リンク';
	};

	$effect(() => {
		void imageViewerRoot;
		void imageViewerImage;
		void media;

		return () => {
			isImageViewerOpen = false;
			imageViewer?.destroy();
			imageViewer = null;
		};
	});
</script>

{#if media.length > 0}
	<div class="w-full">
		<div
			use:emblaCarouselSvelte={{
				plugins: emblaMainCarouselPlugins,
				options: emblaMainCarouselOptions
			}}
			class="overflow-hidden rounded-lg bg-black"
			onemblaInit={onInitEmblaMainCarousel}
		>
			<div class="flex" bind:this={imageViewerRoot}>
				{#each media as item (item.url)}
					<div class="relative aspect-video min-w-0 flex-[0_0_100%]">
						{#if item.type === 'image'}
							{#key item.url}
								{#await new Promise((resolve) => {
									const img = new Image();
									img.onload = () => resolve(img);
									img.src = item.url;
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
											class="c-no-drag-icon absolute inset-0 h-full w-full {objectFitClass(item)}"
											alt={item.alt}
											src={item.url}
										/>
									</button>
								{/await}
							{/key}
						{:else if item.type === 'youtube'}
							<iframe
								class="absolute inset-0 h-full w-full"
								src={`${item.url}?mute=0&controls=1`}
								title={item.title}
								frameborder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								referrerpolicy="strict-origin-when-cross-origin"
								allowfullscreen
							></iframe>
						{:else if item.type === 'video'}
							<video class="absolute inset-0 h-full w-full object-contain" controls src={item.url}>
								<track kind="captions" />
							</video>
						{:else if item.type === 'audio'}
							<div class="flex h-full w-full items-center justify-center p-4">
								<audio class="w-full" controls src={item.url}>
									<track kind="captions" />
								</audio>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		{#each media as item (item.url)}
			{#if item.type === 'image' && (item.credit || item.licenseName || item.linkUrl)}
				<div class="mt-1 text-xs text-gray-400">
					{#if item.credit}
						<span>{item.credit}</span>
					{/if}
					{#if item.licenseName}
						{#if item.credit}
							<span class="mx-1">/</span>
						{/if}
						{#if item.licenseUrl}
							<a
								href={item.licenseUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent hover:underline"
							>
								{item.licenseName}
							</a>
						{:else}
							<span>{item.licenseName}</span>
						{/if}
					{/if}
					{#if item.linkUrl}
						<span class="ml-1">via</span>
						<a
							href={item.linkUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-accent ml-1 hover:underline"
						>
							{sourceLabel(item)}
						</a>
					{/if}
				</div>
			{/if}
		{/each}
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
