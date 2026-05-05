<script lang="ts">
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import { ICON_NO_IMAGE_PATH } from '$routes/constants';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		map: maplibregl.Map;
		featureId: string | number;
		lngLat: LngLat | null;
		properties: { [key: string]: any };
		clickId: string | number | null; // クリックされたPOIのID
		onClick: (featureId: string | number) => void;
	}

	let { lngLat = $bindable(), map, properties, featureId, onClick, clickId }: Props = $props();
	let markerContainer = $state<HTMLElement | null>(null);
	let marker: maplibregl.Marker | null = $state.raw(null);
	let name: maplibregl.Marker | null = $state.raw(null);
	let nameContainer: HTMLElement | null = $state.raw(null);
	let imageUrl: string | null = $state.raw(null);
	let isReady = $state(false); // マーカーの準備完了フラグ

	let isHover = $state(false);

	const jumpToFac = () => {
		mapStore.jumpToFac();
	};

	// 画像キャッシュ（同じ画像の重複読み込みを防ぐ）
	const imageCache = new Map<string, Promise<void>>();

	let imageLoaded = $state(false);
	let imageError = $state(false);
	let latestImageRequestId = 0;

	const preferredImageUrl = $derived.by(() => {
		if (typeof properties.iconImage === 'string' && properties.iconImage !== '') {
			return properties.iconImage;
		}

		if (typeof properties.image === 'string' && properties.image !== '') {
			return properties.image;
		}

		return ICON_NO_IMAGE_PATH;
	});

	// 画像を事前読み込みする関数（キャッシュ付き）
	const preloadImage = (url: string): Promise<void> => {
		if (imageCache.has(url)) {
			return imageCache.get(url)!;
		}

		const promise = new Promise<void>((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve();
			img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
			img.src = url;
		});

		imageCache.set(url, promise);
		return promise;
	};

	// 画像URLを設定し、読み込み完了を待つ
	const loadImage = async (sourceUrl: string) => {
		const fallbackUrl = ICON_NO_IMAGE_PATH;
		const requestId = ++latestImageRequestId;

		try {
			// 画像の読み込み完了を待つ
			await preloadImage(sourceUrl);
			if (requestId !== latestImageRequestId) return;
			imageUrl = sourceUrl;
			imageLoaded = true;
			imageError = false;
		} catch (error) {
			console.warn('Failed to load image:', error);
			try {
				await preloadImage(fallbackUrl);
				if (requestId !== latestImageRequestId) return;
				imageUrl = fallbackUrl;
				imageLoaded = true;
				imageError = false;
			} catch (fallbackError) {
				console.warn('Failed to load fallback image:', fallbackError);
				if (requestId !== latestImageRequestId) return;
				imageError = true;
				imageLoaded = false;
			}
		}
	};

	onMount(async () => {
		// マーカーの初期化を先に実行
		if (markerContainer && lngLat) {
			marker = new maplibregl.Marker({
				element: markerContainer,
				anchor: 'bottom',
				offset: [0, 0]
			})
				.setLngLat(lngLat)
				.addTo(map);
		}

		if (nameContainer && lngLat) {
			name = new maplibregl.Marker({
				element: nameContainer,
				anchor: 'center',
				offset: [0, 40]
			})
				.setLngLat(lngLat)
				.addTo(map);
		}

		// 基本的な準備完了
		isReady = true;

		// 画像読み込みは非同期で実行
		await loadImage(preferredImageUrl);
	});
	onDestroy(() => {
		marker?.remove();
		name?.remove();
		marker = null;
		name = null;
	});

	$effect(() => {
		if (marker && lngLat) {
			marker.setLngLat(lngLat);
		}

		if (name && lngLat) {
			name.setLngLat(lngLat);
		}
	});

	$effect(() => {
		const nextImageUrl = preferredImageUrl;
		imageLoaded = false;
		imageError = false;
		void loadImage(nextImageUrl);
	});

	// フォールバック画像またはプレースホルダーを表示するかどうか
	const showImage = $derived(imageLoaded && !imageError);
</script>

<div
	bind:this={markerContainer}
	class="pointer-events-none relative grid w-[150px] place-items-center drop-shadow-md"
>
	{#if isReady}
		{#if showImage}
			<svg
				transition:fade={{ duration: 100 }}
				viewBox="0 0 24 18"
				aria-hidden="true"
				class="absolute bottom-0 left-1/2 h-[18px] w-[24px] -translate-x-1/2 overflow-visible transition-transform duration-150"
			>
				<path
					d="M0.2 2C0.2 2 4.2 8.2 8.4 12.2C10.1 14 10.7 14.9 12 14.9C13.3 14.9 13.9 14 15.6 12.2C19.8 8.2 23.8 2 23.8 2L23.8 0.9C20 0.9 16.3 1.15 12 1.15C7.7 1.15 4 0.9 0.2 0.9Z"
					fill="white"
				/>
			</svg>
		{/if}

		<button
			class="peer pointer-events-auto relative grid h-[50px] w-[50px] cursor-pointer place-items-center transition-opacity duration-200"
		>
			<div
				class="absolute inset-0 transition-transform duration-150 {isHover || clickId === featureId
					? '-translate-y-[15px] scale-120'
					: ''}"
			>
				{#if showImage}
					<img
						transition:fade={{ duration: 100 }}
						class="bg-main absolute inset-0 h-full w-full rounded-full border-3 border-white object-cover"
						src={imageUrl}
						alt={properties.name || 'Marker Image'}
					/>
				{:else if imageError}
					<!-- エラー時のフォールバック -->
					<div
						transition:fade={{ duration: 100 }}
						class="absolute inset-0 flex h-full w-full items-center justify-center rounded-full border-3 border-white bg-gray-400"
					>
						<span class="text-sm text-white">?</span>
					</div>
				{/if}

				{#if clickId === featureId}
					<div class="c-ripple-effect absolute inset-0 rounded-full border-2 border-amber-50"></div>
					<div
						class="c-ripple-effect2 absolute inset-0 rounded-full border-2 border-amber-50"
					></div>
				{/if}
			</div>
		</button>
	{/if}
</div>

{#if properties.name}
	<div
		bind:this={nameContainer}
		class="items-top pointer-events-none absolute relative z-10 flex w-[200px] -translate-y-7.5 justify-center"
	>
		{#if isReady}
			<div
				transition:fly={{ duration: 200, y: -10, opacity: 0 }}
				class="pointer-none wrap-nowrap bg-base absolute rounded-full p-1 px-3 text-center text-sm text-gray-800"
			>
				{properties.name}
			</div>
		{/if}
	</div>
{/if}

<style>
	.c-ripple-effect {
		opacity: 0;
		animation: ripple 1.5s linear infinite;
	}

	.c-ripple-effect2 {
		opacity: 0;
		animation: ripple 1.5s 0.75s linear infinite;
	}

	/* アニメーションの定義 */
	@keyframes ripple {
		0% {
			scale: 1.2;
			opacity: 0.8;
		}

		100% {
			scale: 1.8;
			opacity: 0;
		}
	}
</style>
