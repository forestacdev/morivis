<script lang="ts">
	import Icon from '@iconify/svelte';
	import DOMPurify from 'dompurify';
	import gsap from 'gsap';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import FacIcon from '$lib/components/svgs/FacIcon.svelte';
	import PrefectureIcon from '$lib/components/svgs/prefectures/PrefectureIcon.svelte';
	import { getAttributionName } from '$routes/map/data/entries/_meta_data/_attribution';
	import { getPrefectureCode } from '$routes/map/data/pref';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { getLayerIcon, getLayerType } from '$routes/map/utils/entries';
	import type { ImageResult } from '$routes/map/utils/image';
	import { getLayerImage } from '$routes/map/utils/image';
	import { CoverImageManager } from '$routes/map/utils/image';
	import { getBaseMapImageUrl } from '$routes/map/utils/image/vector';
	import { checkPc, checkMobile } from '$routes/map/utils/ui';
	import { activeLayerIdsStore } from '$routes/stores/layers';
	import { showNotification, showLayerAddedNotification } from '$routes/stores/notification';
	import { showDataMenu } from '$routes/stores/ui';

	interface Props {
		dataEntry: GeoDataEntry;
		showDataEntry: GeoDataEntry | null;
		itemHeight: number;
		index: number;
		isLeftEdge: boolean;
		isRightEdge: boolean;
		isTopEdge: boolean;
		spinToken?: number;
	}

	let {
		dataEntry,
		showDataEntry = $bindable(),
		itemHeight = $bindable(),
		index,
		isLeftEdge,
		isRightEdge,
		isTopEdge,
		spinToken = 0
	}: Props = $props();

	let isHover = $state(false);
	// Blob URLとクリーンアップ関数を管理するための状態

	let isImageError = $state<boolean>(false);

	let layerType = $derived.by(() => {
		return getLayerType(dataEntry);
	});

	let lastSpinToken = $state(0);
	let card3d = $state<HTMLDivElement | null>(null);
	let isAnimating = $state(false);

	// 画像読み込み完了後のクリーンアップ
	const handleImageLoad = (_imageResult: ImageResult) => {
		if (_imageResult.cleanup) {
			_imageResult.cleanup();
		}
	};

	let isAdded = $derived.by(() => {
		return $activeLayerIdsStore.includes(dataEntry.id);
	});
	let container = $state<HTMLElement | null>(null);

	const updateItemHeight = (newHeight: number) => {
		itemHeight = newHeight + 20;
	};

	onMount(() => {
		if (card3d) {
			gsap.set(card3d, {
				rotationY: 0,
				transformStyle: 'preserve-3d'
			});
		}

		window?.addEventListener('resize', () => {
			if (container) {
				const h = container.clientHeight;
				updateItemHeight(h);
			}
		});
	});

	$effect(() => {
		if (container) {
			const h = container.clientHeight;
			updateItemHeight(h);
		}
	});

	let promise = $state<Promise<ImageResult | undefined>>();

	$effect(() => {
		try {
			promise = getLayerImage(dataEntry);
		} catch (error) {
			isImageError = true;
			console.error('Error generating icon image:', error);
			promise = Promise.resolve(undefined);
		}
	});

	const animateCardSpin = () => {
		if (!card3d || isAnimating) return;

		isAnimating = true;
		gsap.to(card3d, {
			rotationY: '+=360',
			duration: 0.95,
			ease: 'power3.inOut',
			onComplete: () => {
				isAnimating = false;
			}
		});
	};

	const addData = (id: string) => {
		// animateCardSpin();
		activeLayerIdsStore.add(id);
		showLayerAddedNotification(dataEntry);
	};
	const deleteData = (id: string) => {
		activeLayerIdsStore.remove(id);
	};

	let prefCode = $derived.by(() => {
		return getPrefectureCode(dataEntry.metaData.location);
	});

	showDataMenu.subscribe((value) => {
		if (value) {
			if (container) {
				const h = container.clientHeight;
				updateItemHeight(h);
			}
		}
	});

	const getTransformOrigin = () => {
		// 角の場合
		// if (isTopEdge && isLeftEdge) return 'top left';
		// if (isTopEdge && isRightEdge) return 'top right';

		// // 辺の場合
		// if (isTopEdge) return 'top';
		// if (isLeftEdge) return 'left';
		// if (isRightEdge) return 'right';

		// 中央の場合
		return 'center';
	};

	const getHoverTransform = () => {
		if (!isHover) return 'translate3d(0, 0, 0) scale(1) rotate(0deg)';

		const translateX = isLeftEdge ? '20px' : isRightEdge ? '-20px' : '0';
		const translateY = isTopEdge ? '20px' : '0';

		return `translate3d(${translateX}, ${translateY}, 0) scale(1.05) rotate(3deg)`;
	};

	// スマホ用タッチ処理
	const handleTouch = () => {
		if (!checkMobile()) return;
		if (!isAdded) showDataEntry = dataEntry;
	};

	$effect(() => {
		if (!spinToken || spinToken === lastSpinToken) return;

		lastSpinToken = spinToken;
		animateCardSpin();
	});

	const formatDescription = (text: string): string => {
		// 先頭の改行を除去
		const trimmedText = text.replace(/^\n+/, '');

		const urlRegex = /(https?:\/\/[^\s））\]」」＞>、。,]+)/g;
		const linked = trimmedText.replace(urlRegex, (url) => {
			return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
		});
		const withBreaks = linked.replace(/\n/g, '<br>');
		return DOMPurify.sanitize(withBreaks, {
			ALLOWED_TAGS: ['a', 'br'],
			ALLOWED_ATTR: ['href', 'target', 'rel']
		});
	};

	let isSelected = $derived.by(() => {
		return showDataEntry?.id === dataEntry.id;
	});
</script>

<div
	class="relative flex aspect-3/4 shrink-0 grow flex-col items-center overflow-visible rounded-lg transition-all duration-220 select-none perspective-distant {isHover
		? 'z-10'
		: ''}"
	style="transform-origin: {getTransformOrigin()}; transform: {!isSelected
		? getHoverTransform()
		: 'translate3d(0, 0, 0) scale(1) rotate(0deg)'};"
	bind:this={container}
	onmouseover={() => (checkPc() ? (isHover = true) : null)}
	onmouseleave={() => (checkPc() ? (isHover = false) : null)}
	onfocus={() => (checkPc() ? (isHover = true) : null)}
	onblur={() => (checkPc() ? (isHover = false) : null)}
	onclick={handleTouch}
	tabindex="0"
	role="button"
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			handleTouch();
		}
	}}
>
	<!-- 追加ボタン -->
	{#if isHover && !isAnimating && !isSelected}
		<div transition:fade={{ duration: 200 }} class="absolute top-2 right-2 z-10 shrink-0">
			{#if isAdded}
				<button
					onclick={(e) => {
						e.stopPropagation();
						deleteData(dataEntry.id);
					}}
					class="c-btn-sub grid place-items-center p-1"
				>
					<Icon icon="ic:round-minus" class=" h-6 w-6" />
				</button>
			{:else}
				<button
					onclick={(e) => {
						e.stopPropagation();
						addData(dataEntry.id);
					}}
					class="c-btn-confirm grid place-items-center p-1"
				>
					<Icon icon="material-symbols:add" class=" h-6 w-6" />
				</button>
			{/if}
		</div>
		{#if import.meta.env.DEV && !dataEntry.metaData.mapImage && dataEntry.type === 'vector'}
			<!-- タグ -->
			<button
				transition:fade={{ duration: 150 }}
				onclick={() => {
					// エクスポート処理を実装
					console.log('Export button clicked');
					CoverImageManager.export(dataEntry.id);
				}}
				class="absolute top-8 z-10 flex cursor-pointer items-center rounded-full bg-white/50 p-2"
			>
				エクスポート
			</button>
		{/if}
	{/if}
	<div bind:this={card3d} class="card-3d relative h-full w-full">
		<button
			onclick={() => {
				if (!isAdded) showDataEntry = dataEntry;
			}}
			class="flip-face card-front absolute inset-0 flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-lg bg-black {isHover ||
			isSelected
				? 'border-accent c-set-glow shadow-lg'
				: 'border-main'}"
		>
			<div class="group relative flex aspect-square w-full shrink-0 overflow-hidden bg-black">
				{#await promise then imageResult}
					{#if imageResult}
						{#if dataEntry.metaData.coverImage && !isImageError}
							<img
								src={dataEntry.metaData.coverImage}
								class="c-no-drag-icon absolute h-full w-full object-cover transition-transform duration-150"
								alt={dataEntry.metaData.name}
								loading="lazy"
								onerror={() => {
									console.error('Image loading failed:', dataEntry.metaData.name);
									isImageError = true;
								}}
							/>
						{:else}
							{#if dataEntry.metaData.xyzImageTile && !dataEntry.metaData.coverImage && !isImageError && dataEntry.type === 'vector'}
								<!-- 背景地図画像 -->
								<img
									src={getBaseMapImageUrl(dataEntry.metaData.xyzImageTile)}
									class="c-basemap-img absolute h-full w-full object-cover transition-transform duration-150"
									alt="背景地図画像"
									loading="lazy"
									onerror={() => {
										console.error('Image loading failed: BaseMap Image');
										isImageError = true;
									}}
								/>
							{/if}
							<img
								src={imageResult.url}
								class="c-no-drag-icon absolute h-full w-full object-cover transition-transform duration-150"
								alt={dataEntry.metaData.name}
								onload={() => handleImageLoad(imageResult)}
								loading="lazy"
								onerror={() => {
									console.error('Image loading failed:', dataEntry.metaData.name);
									isImageError = true;
								}}
							/>
						{/if}
					{/if}
				{:catch}
					<div class="text-accent">データが取得できませんでした</div>
				{/await}
				<div class="pointer-events-none absolute h-full w-full">
					<div class="c-vignette absolute h-full w-full"></div>
				</div>
				<!-- オーバーレイ -->
				{#if !isHover}
					<div
						transition:fade={{ duration: 150 }}
						class="pointer-events-none absolute h-full w-full"
					>
						<div class="c-gradient absolute h-full w-full"></div>
					</div>
				{/if}
				{#if isHover && !isAdded && !isSelected}
					<div
						transition:fade={{ duration: 150 }}
						class="pointer-events-none absolute grid h-full w-full place-items-center"
					>
						<div
							class="flex items-center justify-center gap-1 rounded-full bg-black/80 p-2 px-4 text-lg text-white"
						>
							<Icon icon="akar-icons:eye" class="h-7 w-7" /><span>プレビュー</span>
						</div>
					</div>
				{/if}

				{#if isAdded && !isSelected}
					<div
						transition:fade={{ duration: 150 }}
						class="pointer-events-none absolute grid h-full w-full place-items-center"
					>
						<div
							class=" flex w-full items-center justify-center gap-1 bg-black/60 p-2 px-4 text-lg text-white"
						>
							<Icon icon="lets-icons:check-fill" class="h-7 w-7" /><span>追加済み</span>
						</div>
					</div>
				{/if}

				<!-- レイヤータイプアイコン -->
				{#if layerType}
					<div
						class="bounded-full border-base absolute aspect-square rounded-full border-2 bg-black/80 p-2 text-base max-lg:top-1 max-lg:left-1 lg:top-2 lg:left-2"
					>
						<Icon icon={getLayerIcon(layerType)} class="max-lg:h-5 max-lg:w-5 lg:h-6 lg:w-6" />
					</div>
				{/if}

				<!-- タグ -->
				<div class="absolute bottom-[0px] flex items-center gap-1 p-4 text-gray-300">
					{#each dataEntry.metaData.tags as tag}
						<span class="bg-sub rounded-full p-1 px-2 text-xs">{tag}</span>
					{/each}
				</div>
			</div>

			<!-- 詳細情報 -->
			<div
				class="relative flex h-full w-full flex-col items-end justify-end gap-1 bg-black pb-4 max-lg:p-1 lg:p-2"
			>
				<!-- タイトル -->
				<div
					class="flex h-full w-full flex-col justify-center text-left text-white lg:gap-1 lg:pl-2"
				>
					<span class="max-lg:text-md max-lg:leading-5 lg:text-lg lg:leading-6"
						>{dataEntry.metaData.name}</span
					>
					<!-- 出典 -->
					<span class="text-left text-xs text-gray-400">
						{getAttributionName(dataEntry.metaData.attribution)}</span
					>
					<!-- 場所アイコン -->
					<div
						class="absolute right-0 bottom-0 grid h-full place-items-center opacity-20 max-lg:pr-1 lg:pr-2"
					>
						{#if dataEntry.metaData.location === '森林文化アカデミー'}
							<div class="grid place-items-center [&_path]:fill-white">
								<FacIcon width={'60px'} />
							</div>
						{/if}
						{#if prefCode}
							<div class="[&_path]:fill-base grid aspect-square place-items-center">
								<PrefectureIcon width={'80px'} code={prefCode} />
							</div>
							<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
						{/if}
						{#if dataEntry.metaData.location === '全国'}
							<div class="grid place-items-center">
								<Icon icon="emojione-monotone:map-of-japan" class="h-20 w-20 text-base" />
								<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
							</div>
						{/if}
						{#if dataEntry.metaData.location === '世界'}
							<div class="grid place-items-center">
								<Icon icon="fxemoji:worldmap" class="[&_path]:fill-base h-20 w-20" />
								<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
							</div>
						{/if}
					</div>
				</div>
			</div>
		</button>

		<!-- カード裏面 -->
		<div
			class="flip-face card-back absolute inset-0 h-full w-full overflow-hidden rounded-lg bg-black {isHover ||
			isSelected
				? 'border-accent c-set-glow shadow-lg'
				: 'border-main'}"
		>
			<!-- 背景 -->
			<div class="absolute -z-10 grid h-full w-full place-items-center p-6 opacity-5">
				{#if dataEntry.metaData.location === '森林文化アカデミー'}
					<div class="grid aspect-square place-items-center [&_path]:fill-white">
						<FacIcon width={'100%'} />
					</div>
				{/if}
				{#if prefCode}
					<div class="[&_path]:fill-base grid aspect-square w-full place-items-center">
						<PrefectureIcon width={'100%'} code={prefCode} />
					</div>
					<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
				{/if}
				{#if dataEntry.metaData.location === '全国'}
					<div class="grid aspect-square w-full place-items-center">
						<Icon icon="emojione-monotone:map-of-japan" class="h-full w-full text-base" />
						<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
					</div>
				{/if}
				{#if dataEntry.metaData.location === '世界'}
					<div class="grid aspect-square w-full place-items-center">
						<Icon icon="fxemoji:worldmap" class="[&_path]:fill-base h-full w-full" />
						<!-- <span class="absolute text-base text-xs">{dataEntry.metaData.location}</span> -->
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* カード裏面・表面の共通スタイル */
	.card-3d {
		height: 100%;
		transform-style: preserve-3d;
	}

	.flip-face {
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		will-change: transform;
	}

	.card-front {
		transform: rotateY(0deg);
	}

	.card-back {
		transform: rotateY(180deg);
	}

	/* カード表面のスタイル */

	.c-set-glow {
		filter: drop-shadow(0 0 3px var(--color-accent));
	}
	.c-vignette {
		box-shadow:
			inset 0 0 100px rgba(0, 0, 0, 0.4),
			inset 0 0 200px rgba(0, 0, 0, 0.2);
	}

	.c-gradient {
		background: linear-gradient(
			0deg,
			rgb(0, 0, 0) 0%,

			rgba(233, 233, 233, 0) 100%
		);
	}
</style>
