<script lang="ts">
	import type { LngLat } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';
	import { mapStore, isHoverPoiMarker } from '$routes/stores/map';
	import { fade, fly, scale } from 'svelte/transition';
	import { checkMobile } from '$routes/map/utils/ui';

	interface Props {
		map: maplibregl.Map;
		featureId: number;
		lngLat: LngLat | null;
		properties: { [key: string]: any };
		clickId: number | null; // クリックされたPOIのID
		onClick: (featureId: number) => void;
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

	const onHover = (val: boolean) => {
		if (checkMobile()) return;
		isHoverPoiMarker.set(val);
		isHover = val;
	};

	const click = () => {
		onClick(featureId);
	};

	// 画像キャッシュ（同じ画像の重複読み込みを防ぐ）
	const imageCache = new Map<string, Promise<void>>();

	let imageLoaded = $state(false);
	let imageError = $state(false);

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
	const loadImage = async () => {
		const id = properties._prop_id;

		try {
			// 画像URLを決定
			if (id === 'fac_top') {
				imageUrl = properties.image;
			} else {
				imageUrl = properties.iconImage;
			}

			// 画像URLが存在しない場合
			if (!imageUrl) {
				imageError = true;
				return;
			}

			// 画像の読み込み完了を待つ
			await preloadImage(imageUrl);
			imageLoaded = true;
			imageError = false;
		} catch (error) {
			console.warn('Failed to load image:', error);
			imageError = true;
			imageLoaded = false;
		}
	};

	onMount(async () => {
		// マーカーの初期化を先に実行
		if (markerContainer && lngLat) {
			marker = new maplibregl.Marker({
				element: markerContainer,
				anchor: 'center',
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
		await loadImage();
	});
	onDestroy(() => {
		marker?.remove();
		name?.remove();
		marker = null;
		name = null;
	});

	// フォールバック画像またはプレースホルダーを表示するかどうか
	const showPlaceholder = $derived(!imageLoaded && !imageError);
	const showImage = $derived(imageLoaded && !imageError);
</script>

{#if properties._prop_id === 'fac_top'}
	<div
		bind:this={markerContainer}
		class="pointer-events-none relative grid w-[150px] place-items-center"
	>
		{#if isReady}
			<button
				class="pointer-events-auto relative grid h-[100px] w-[100px] cursor-pointer place-items-center drop-shadow-md"
				onclick={jumpToFac}
				onfocus={() => onHover(true)}
				onblur={() => onHover(false)}
				onmouseover={() => onHover(true)}
				onmouseleave={() => onHover(false)}
			>
				{#if showImage}
					<img
						transition:fade={{ duration: 100 }}
						class="hover:scale-120 absolute h-[50px] w-[50px] rounded-full object-cover transition-all duration-150"
						src={imageUrl}
						alt={properties.name}
					/>
				{:else if imageError}
					<!-- エラー時のフォールバック -->
					<div
						transition:fade={{ duration: 100 }}
						class="absolute flex h-[50px] w-[50px] items-center justify-center rounded-full bg-gray-400"
					>
						<span class="text-xs text-white">?</span>
					</div>
				{/if}
			</button>
		{/if}
	</div>
{:else}
	<div
		bind:this={markerContainer}
		class="pointer-events-none relative grid w-[150px] place-items-center"
	>
		{#if isReady}
			<button
				class="peer pointer-events-auto relative grid h-[50px] w-[50px] cursor-pointer place-items-center drop-shadow-md transition-opacity duration-200"
				onclick={click}
				onfocus={() => onHover(true)}
				onblur={() => onHover(false)}
				onmouseover={() => onHover(true)}
				onmouseleave={() => onHover(false)}
			>
				{#if showImage}
					<img
						transition:fade={{ duration: 100 }}
						class="border-base bg-main border-3 absolute h-full w-full rounded-full object-cover transition-all duration-150 {isHover ||
						clickId === featureId
							? 'scale-120'
							: ''}"
						src={imageUrl}
						alt={properties.name || 'Marker Image'}
					/>
				{:else if imageError}
					<!-- エラー時のフォールバック -->
					<div
						transition:fade={{ duration: 100 }}
						class="border-base border-3 absolute flex h-full w-full items-center justify-center rounded-full bg-gray-400 transition-all duration-150 {isHover ||
						clickId === featureId
							? 'scale-120'
							: ''}"
					>
						<span class="text-sm text-white">?</span>
					</div>
				{/if}
				<!-- エフェクト -->
				{#if clickId === featureId}
					<div
						class="c-ripple-effect absolute top-0 h-full w-full rounded-full border-2 border-amber-50"
					></div>
					<div
						class="c-ripple-effect2 absolute top-0 h-full w-full rounded-full border-2 border-amber-50"
					></div>
				{/if}
			</button>
		{/if}
	</div>

	<div
		bind:this={nameContainer}
		class="items-top pointer-events-none relative z-10 flex w-[170px] justify-center"
	>
		{#if (isHover || clickId === featureId) && isReady}
			<div
				transition:fly={{ duration: 200, y: -10, opacity: 0 }}
				class="pointer-none wrap-nowrap bg-base absolute rounded-full p-1 px-2 text-center text-sm text-gray-800"
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
