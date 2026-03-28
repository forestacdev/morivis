<script lang="ts">
	import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
	import Autoplay from 'embla-carousel-autoplay';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { onDestroy } from 'svelte';

	import Accordion from '../../atoms/Accordion.svelte';
	import type {
		RasterEntry,
		RasterCategoricalStyle,
		RasterBaseMapStyle,
		RasterDemStyle,
		RasterDemEntry,
		RasterTiffStyle,
		RasterCadStyle
	} from '$routes/map/data/types/raster';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: RasterEntry<
			| RasterCategoricalStyle
			| RasterBaseMapStyle
			| RasterDemStyle
			| RasterTiffStyle
			| RasterCadStyle
		>;
		showTimeOption: boolean;
	}

	let { layerEntry = $bindable(), showTimeOption = $bindable() }: Props = $props();

	let emblaMainCarousel: EmblaCarouselType | undefined = $state();
	let emblaMainCarouselOptions: EmblaOptionsType = {
		loop: true,
		dragFree: false,
		align: 'center',
		containScroll: 'trimSnaps', // スナップを調整
		duration: 25,
		slidesToScroll: 1, // 1つずつスクロール
		startIndex: 0
	};
	// let emblaThumbnailCarousel: EmblaCarouselType | undefined = $state();
	let emblaMainCarouselPlugins: EmblaPluginType[] = [
		Autoplay({
			delay: 1000,
			// stopOnMouseEnter: true, // マウスホバー時に停止
			playOnInit: false // 初期化時に自動再生開始
		})
	];

	const onSelect = () => {
		if (!emblaMainCarousel || !layerEntry.style.timeDimension) return;
		const currentIndex = emblaMainCarousel.selectedScrollSnap();
		layerEntry.style.timeDimension.currentIndex = currentIndex; // 現在のインデックスをスタイルに保存
	};

	// const onSelect = () => {
	// 	if (!emblaMainCarousel || !layerEntry.style.timeDimension) return;
	// 	const currentIndex = emblaMainCarousel.selectedScrollSnap();
	// 	const sourceId = `${layerEntry.id}_source`;
	// 	const timeValue = layerEntry.style.timeDimension.values[currentIndex];
	// 	if (timeValue) {
	// 		const tileUrl = layerEntry.format.url.replace('{time}', timeValue);
	// 		mapStore.setTiles(sourceId, [tileUrl]);
	// 	}
	// };

	const onInitEmblaMainCarousel = (event: CustomEvent<EmblaCarouselType>) => {
		emblaMainCarousel = event.detail;
		emblaMainCarousel.on('select', onSelect).on('reInit', onSelect);

		emblaMainCarousel = event.detail;

		// ホイールイベントリスナーを追加
		if (carouselElement) {
			carouselElement.addEventListener('wheel', handleWheel, { passive: false });
		}
	};

	const onClickNext = () => {
		if (!emblaMainCarousel) return;
		emblaMainCarousel.scrollNext();
	};
	const onClickPrev = () => {
		if (!emblaMainCarousel) return;
		emblaMainCarousel.scrollPrev();
	};

	// ホイールイベント用の変数
	let carouselElement: HTMLElement | undefined = $state();
	let wheelTimeout: ReturnType<typeof setTimeout> | null = null;
	let isWheelScrolling = $state(false);

	// マウスホイールイベントハンドラー
	const handleWheel = (event: WheelEvent) => {
		if (!emblaMainCarousel) return;

		// 縦スクロールのみ対応（横スクロールも対応したい場合は deltaX も使用）
		const { deltaY } = event;

		// スクロール感度の調整（数値を大きくすると敏感になる）
		const threshold = 10;

		if (Math.abs(deltaY) > threshold) {
			event.preventDefault(); // ページのスクロールを防ぐ

			if (deltaY > 0) {
				// 下方向スクロール = 次へ
				emblaMainCarousel.scrollNext();
			} else {
				// 上方向スクロール = 前へ
				emblaMainCarousel.scrollPrev();
			}

			// スクロール状態の管理
			isWheelScrolling = true;
			if (wheelTimeout) clearTimeout(wheelTimeout);
			wheelTimeout = setTimeout(() => {
				isWheelScrolling = false;
			}, 150);
		}
	};

	onDestroy(() => {
		if (carouselElement) {
			carouselElement.removeEventListener('wheel', handleWheel);
		}
		if (wheelTimeout) {
			clearTimeout(wheelTimeout);
		}
	});

	const formatTimeValue = (value: string): string => {
		// 年のみ: "2026"
		if (/^\d{4}$/.test(value)) return `${Number(value)}年`;
		// 年月のみ: "2026-01"
		const ym = value.match(/^(\d{4})-(\d{2})$/);
		if (ym) return `${Number(ym[1])}年${Number(ym[2])}月`;
		// 日付のみ: "2026-01-15"
		const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (ymd) return `${Number(ymd[1])}年${Number(ymd[2])}月${Number(ymd[3])}日`;

		// ISO 8601 (T含む): "2026-01-01T00:00:00Z"
		const date = new Date(value);
		if (isNaN(date.getTime())) return value;

		const y = date.getUTCFullYear();
		const m = date.getUTCMonth() + 1;
		const d = date.getUTCDate();
		const h = date.getUTCHours();
		const min = date.getUTCMinutes();

		if (h === 0 && min === 0) {
			return d === 1 ? `${y}年${m}月` : `${y}年${m}月${d}日`;
		}
		return `${y}年${m}月${d}日 ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
	};
</script>

{#if layerEntry.style.timeDimension}
	<Accordion label={'時間ステップ'} icon={'mdi:clock-outline'} bind:value={showTimeOption}>
		<div class="flex flex-col gap-2 p-2">
			<div
				use:emblaCarouselSvelte={{
					plugins: emblaMainCarouselPlugins,
					options: emblaMainCarouselOptions
				}}
				bind:this={carouselElement}
				class="overflow-hidden"
				onemblaInit={onInitEmblaMainCarousel}
			>
				<div class="flex gap-2 px-2">
					{#each layerEntry.style.timeDimension.values as timeValue, i}
						<div
							class="border-sub flex h-full flex-[0_0_70%] items-center justify-center rounded border-1 bg-black text-white select-none"
						>
							{formatTimeValue(timeValue)}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</Accordion>
{/if}
