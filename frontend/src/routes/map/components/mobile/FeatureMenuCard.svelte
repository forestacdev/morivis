<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import gsap from 'gsap';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { checkMobile } from '$routes/map/utils/ui';
	import { fly } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import { generatePopupTitle } from '$routes/map/utils/properties';
	import { isMobile } from '$routes/stores/ui';

	interface Props {
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		showSelectionMarker: boolean;
		children: Snippet;
	}

	let {
		featureMenuData = $bindable(),
		layerEntries,
		showSelectionMarker = $bindable(),
		children
	}: Props = $props();

	let cardElement = $state<HTMLElement | null>(null);
	let contentElement = $state<HTMLElement | null>(null);
	let isDragging = $state(false);
	let startY = $state(0);
	let currentY = $state(0);
	let translateY = $state(50); // 初期位置：50%下に配置
	let isExpanded = $state(false);
	let isAnimating = $state(false); // アニメーション中フラグ
	let isFullyAnimated = $state(false); // アニメーション完了フラグ

	// スクロール連携用の変数
	let scrollTransitionStartY = $state(0);
	let initialScrollTop = $state(0);

	// スワイプ検知の閾値
	const SWIPE_THRESHOLD = 100; // 位置による判定の閾値
	const VELOCITY_THRESHOLD = 0.8; // 速度による判定の閾値 (px/ms)
	const MIN_SWIPE_DISTANCE = 30; // 最小スワイプ距離
	const VELOCITY_MULTIPLIER = 200; // 速度を距離に変換する係数

	// タップ判定の閾値
	const TAP_THRESHOLD_TIME = 300;
	const TAP_THRESHOLD_DISTANCE = 10;

	let lastTouchTime = 0;
	let lastTouchY = 0;

	// タッチ判定用
	let tapStartTime = 0;
	let tapStartPosition = { x: 0, y: 0 };
	let touchHandled = $state(false);

	// 速度計算用
	let velocityTracker: { time: number; y: number }[] = [];

	// 速度を計算する関数
	const calculateVelocity = () => {
		if (velocityTracker.length < 2) return 0;

		const latest = velocityTracker[velocityTracker.length - 1];
		const earliest = velocityTracker[0];

		const timeDiff = latest.time - earliest.time;
		const positionDiff = latest.y - earliest.y;

		return timeDiff > 0 ? positionDiff / timeDiff : 0; // px/ms
	};

	// 慣性を考慮した判定関数
	const shouldExpandWithInertia = (deltaY: number, velocity: number) => {
		// 上向きスワイプ（マイナス値）
		if (deltaY < 0) {
			// 速度による判定
			if (Math.abs(velocity) > VELOCITY_THRESHOLD && Math.abs(deltaY) > MIN_SWIPE_DISTANCE) {
				return true;
			}
			// 位置による判定
			return translateY < 25;
		}
		return false;
	};

	const shouldCollapseWithInertia = (deltaY: number, velocity: number) => {
		// 下向きスワイプ（プラス値）
		if (deltaY > 0) {
			// 速度による判定
			if (velocity > VELOCITY_THRESHOLD && deltaY > MIN_SWIPE_DISTANCE) {
				return true;
			}
			// 位置による判定
			return translateY > 25;
		}
		return false;
	};

	const shouldCloseCompletely = (deltaY: number, velocity: number) => {
		// 下向きスワイプで、折りたたみ状態からさらに下に引っ張る場合
		if (deltaY > 0 && !isExpanded) {
			// 速度による判定（勢いよく下にスワイプ）
			if (velocity > VELOCITY_THRESHOLD && deltaY > MIN_SWIPE_DISTANCE) {
				return true;
			}
			// 位置による判定（75%より下まで引っ張った場合）
			return translateY > 75;
		}
		return false;
	};

	onMount(() => {
		// グローバルマウスイベント
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	});

	// アニメーション関数
	const animateCard = (targetY: number, duration: number = 0.2) => {
		if (!cardElement) return;

		isAnimating = true;
		isFullyAnimated = false;

		// 現在位置を正確に設定してからアニメーション開始
		gsap.set(cardElement, { y: `${translateY}%` });

		gsap.to(cardElement, {
			y: `${targetY}%`,
			duration: duration,
			ease: 'power2.out',
			onComplete: () => {
				isAnimating = false;
				isFullyAnimated = true;
				translateY = targetY;
			}
		});
	};

	// タッチ開始
	const handleTouchStart = (event: TouchEvent) => {
		touchHandled = false;

		// 展開時の特別処理
		if (isExpanded && isFullyAnimated && contentElement) {
			const touch = event.touches[0];
			const rect = contentElement.getBoundingClientRect();
			const isInsideContent = touch.clientY >= rect.top && touch.clientY <= rect.bottom;

			if (isInsideContent) {
				const isAtTop = contentElement.scrollTop === 0;

				// スクロールが途中の場合は、まずスクロール操作を優先
				if (!isAtTop) {
					return;
				}
			}
		}

		isDragging = true;
		startY = event.touches[0].clientY;
		currentY = startY;
		lastTouchTime = Date.now();
		lastTouchY = startY;

		// 速度トラッキングを初期化
		velocityTracker = [{ time: lastTouchTime, y: startY }];

		// アニメーション中の場合は停止
		if (isAnimating && cardElement) {
			gsap.killTweensOf(cardElement);
			isAnimating = false;
		}

		// タップ判定用の記録
		tapStartTime = Date.now();
		tapStartPosition = {
			x: event.touches[0].clientX,
			y: event.touches[0].clientY
		};
	};

	// タッチ移動
	const handleTouchMove = (event: TouchEvent) => {
		if (!cardElement) return;

		const touch = event.touches[0];
		currentY = touch.clientY;
		const deltaY = currentY - startY;
		const now = Date.now();

		// 速度トラッキング用のデータポイントを追加
		velocityTracker.push({ time: now, y: currentY });

		// 過去100ms以内のデータのみ保持
		velocityTracker = velocityTracker.filter((point) => now - point.time <= 100);

		// 展開時の特別処理
		if (isExpanded && isFullyAnimated && contentElement) {
			const rect = contentElement.getBoundingClientRect();
			const isInsideContent = touch.clientY >= rect.top && touch.clientY <= rect.bottom;

			if (isInsideContent) {
				const isAtTop = contentElement.scrollTop === 0;

				// 下向きスワイプの場合
				if (deltaY > 0) {
					if (!isAtTop) {
						return; // スクロールを優先
					}
					if (!isDragging) {
						isDragging = true;
						startY = touch.clientY;
						currentY = startY;
					}
				}
				// 上向きスワイプの場合はスクロールを優先
				else if (deltaY < 0) {
					return;
				}
			}
		}

		if (!isDragging) return;

		const cardHeight = cardElement.offsetHeight;
		let basePosition = isExpanded ? 0 : 50;
		const baseOffsetPx = cardHeight * (basePosition / 100);
		const newOffsetPx = baseOffsetPx + deltaY;
		let newTranslateY = (newOffsetPx / cardHeight) * 100;

		// Yが0以下にならないように制限
		if (newTranslateY <= 0) {
			translateY = 0;

			// スクロール移行の処理
			if (!isExpanded) {
				isExpanded = true;
				isFullyAnimated = true; // ドラッグ時は即座に完了状態に
			}

			// スクロール移行時の基準点設定
			if (deltaY < 0 && contentElement) {
				if (scrollTransitionStartY === 0) {
					scrollTransitionStartY = currentY;
					initialScrollTop = contentElement.scrollTop;
				}

				// 移行後の指の移動量のみをスクロールに適用
				const scrollDelta = scrollTransitionStartY - currentY;
				const newScrollTop = initialScrollTop + scrollDelta;
				contentElement.scrollTop = Math.max(0, newScrollTop);
			}

			// スタイルを直接更新
			cardElement.style.transform = `translateY(0%)`;
		} else {
			translateY = newTranslateY;
			// スタイルを直接更新
			cardElement.style.transform = `translateY(${translateY}%)`;

			// スクロール移行の基準点をリセット
			scrollTransitionStartY = 0;
		}
	};

	// タッチ終了
	const handleTouchEnd = (event: TouchEvent) => {
		if (!isDragging || touchHandled) return;

		isDragging = false;
		touchHandled = true;

		// スクロール移行の基準点をリセット
		scrollTransitionStartY = 0;

		const deltaY = currentY - startY;
		const now = Date.now();
		const velocity = calculateVelocity();

		// タップ判定
		const tapDuration = now - tapStartTime;
		const tapDistance = Math.sqrt(
			Math.pow(event.changedTouches[0].clientX - tapStartPosition.x, 2) +
				Math.pow(event.changedTouches[0].clientY - tapStartPosition.y, 2)
		);

		const isTap = tapDuration < TAP_THRESHOLD_TIME && tapDistance < TAP_THRESHOLD_DISTANCE;

		if (isTap) {
			toggleCard();
		} else {
			// 完全に閉じる判定を最初にチェック
			if (shouldCloseCompletely(deltaY, velocity)) {
				featureMenuData = null;
				return;
			}

			// 慣性を考慮した判定
			if (isExpanded) {
				if (shouldCollapseWithInertia(deltaY, velocity)) {
					collapseCard();
				} else {
					expandCard();
				}
			} else {
				if (shouldExpandWithInertia(deltaY, velocity)) {
					expandCard();
				} else {
					collapseCard();
				}
			}
		}

		setTimeout(() => {
			touchHandled = false;
		}, 100);
	};

	// カード展開
	const expandCard = () => {
		isExpanded = true;
		animateCard(0);
	};

	// カード折りたたみ
	const collapseCard = () => {
		isExpanded = false;
		isFullyAnimated = false;
		animateCard(50);
	};

	// 展開・折りたたみの切り替え
	const toggleCard = () => {
		if (isExpanded) {
			collapseCard();
		} else {
			expandCard();
		}
	};

	// マウスイベント（デスクトップ用）
	let isMouseDown = $state(false);
	let mouseStartTime = 0;
	let mouseStartPosition = { x: 0, y: 0 };

	const handleMouseDown = (event: MouseEvent) => {
		if (touchHandled) return;

		isMouseDown = true;
		startY = event.clientY;
		currentY = startY;
		isDragging = true;

		// 速度トラッキングを初期化
		const now = Date.now();
		velocityTracker = [{ time: now, y: startY }];

		// アニメーション中の場合は停止
		if (isAnimating && cardElement) {
			gsap.killTweensOf(cardElement);
			isAnimating = false;
		}

		mouseStartTime = Date.now();
		mouseStartPosition = {
			x: event.clientX,
			y: event.clientY
		};
	};

	const handleMouseMove = (event: MouseEvent) => {
		if (!isMouseDown || !isDragging || !cardElement) return;

		currentY = event.clientY;
		const now = Date.now();

		// 速度トラッキング
		velocityTracker.push({ time: now, y: currentY });
		velocityTracker = velocityTracker.filter((point) => now - point.time <= 100);

		const deltaY = currentY - startY;
		const cardHeight = cardElement.offsetHeight;

		let basePosition = isExpanded ? 0 : 50;
		const baseOffsetPx = cardHeight * (basePosition / 100);
		const newOffsetPx = baseOffsetPx + deltaY;
		let newTranslateY = (newOffsetPx / cardHeight) * 100;

		if (newTranslateY <= 0) {
			translateY = 0;
			if (!isExpanded) {
				isExpanded = true;
				isFullyAnimated = true;
			}
			cardElement.style.transform = `translateY(0%)`;
		} else if (newTranslateY > 100) {
			// マウスでも100%を超えることを許可
			translateY = Math.min(newTranslateY, 120);
			cardElement.style.transform = `translateY(${translateY}%)`;
		} else {
			translateY = newTranslateY;
			cardElement.style.transform = `translateY(${translateY}%)`;
		}
	};

	const handleMouseUp = (event: MouseEvent) => {
		if (!isMouseDown || touchHandled) return;

		isMouseDown = false;
		isDragging = false;
		const deltaY = currentY - startY;
		const now = Date.now();
		const velocity = calculateVelocity();

		const clickDuration = now - mouseStartTime;
		const clickDistance = Math.sqrt(
			Math.pow(event.clientX - mouseStartPosition.x, 2) +
				Math.pow(event.clientY - mouseStartPosition.y, 2)
		);

		const isClick = clickDuration < TAP_THRESHOLD_TIME && clickDistance < TAP_THRESHOLD_DISTANCE;

		if (isClick) {
			toggleCard();
		} else {
			// 完全に閉じる判定を最初にチェック（マウス版）
			if (shouldCloseCompletely(deltaY, velocity)) {
				featureMenuData = null;
				return;
			}

			// 慣性を考慮した判定（マウス版）
			if (isExpanded) {
				if (shouldCollapseWithInertia(deltaY, velocity)) {
					collapseCard();
				} else {
					expandCard();
				}
			} else {
				if (shouldExpandWithInertia(deltaY, velocity)) {
					expandCard();
				} else {
					collapseCard();
				}
			}
		}
	};

	$effect(() => {
		if (!featureMenuData) {
			collapseCard();
		}
	});

	let propId = $derived.by(() => {
		if (featureMenuData && featureMenuData.properties) {
			return featureMenuData.properties._prop_id;
		} else {
			return null;
		}
	});

	let targetLayer = $derived.by(() => {
		if (featureMenuData) {
			const layer = layerEntries.find(
				(entry) => featureMenuData && entry.id === featureMenuData.layerId
			);
			return layer;
		}
		return null;
	});
</script>

{#if featureMenuData && $isMobile}
	<!-- スワイプ可能なカード -->
	<div
		transition:fly={{
			duration: 300,
			y: 300,
			opacity: 0
		}}
		bind:this={cardElement}
		class="bg-main absolute bottom-0 z-20 h-[calc(100%_-_20px)] w-full touch-none overflow-hidden rounded-[20px_20px_0_0] shadow-[0_-4px_20px_rgba(0,_0,_0,_0.15)]"
		style="transform: translateY({translateY}%)"
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		onmousedown={handleMouseDown}
		role="button"
		tabindex="0"
	>
		<!-- ハンドルバー -->
		<div class="flex cursor-grab justify-center p-[12px_0_8px]">
			<div class="handle-bar h-1 w-10 rounded bg-gray-400"></div>
		</div>

		<div class="flex w-full items-center justify-between p-4 px-4">
			<!-- タイトル -->
			<div>
				{#if propId && featureMenuData.properties && featureMenuData.properties._prop_id}
					<!-- poiタイトル -->
					<span class="text-base text-[22px] font-bold">{featureMenuData.properties.name}</span>
				{:else}
					<!-- その他 -->
					<span class="text-base text-[22px] font-bold"
						>{targetLayer &&
						targetLayer.type === 'vector' &&
						targetLayer.properties.titles.length &&
						featureMenuData.properties
							? generatePopupTitle(featureMenuData.properties, targetLayer.properties.titles)
							: targetLayer?.metaData.name}</span
					>
				{/if}
			</div>
			<button
				onclick={(e) => {
					e.stopPropagation();
					featureMenuData = null;
				}}
				ontouchend={(e) => e.stopPropagation()}
				class="bg-base ml-auto cursor-pointer rounded-full p-2 shadow-md"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div>

		<!-- スクロール可能なコンテンツ -->
		<div
			bind:this={contentElement}
			class="h-[calc(100%_-_60px)] overflow-y-auto px-4 pb-4"
			class:touch-auto={isExpanded && isFullyAnimated}
			class:touch-none={!isExpanded || !isFullyAnimated}
		>
			<!-- ダミーコンテンツ -->
			{@render children()}
		</div>
	</div>
{/if}
