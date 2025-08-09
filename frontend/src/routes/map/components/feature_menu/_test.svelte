<script lang="ts">
	import { onMount } from 'svelte';

	let cardElement = $state<HTMLElement | null>(null);
	let isDragging = $state(false);
	let startY = $state(0);
	let currentY = $state(0);
	let translateY = $state(50); // 初期位置：50%下に配置
	let isExpanded = $state(false);

	// スワイプ検知の閾値
	const SWIPE_THRESHOLD = 100;
	const VELOCITY_THRESHOLD = 0.5;

	let lastTouchTime = 0;
	let lastTouchY = 0;

	// タッチ開始
	const handleTouchStart = (event: TouchEvent) => {
		isDragging = true;
		startY = event.touches[0].clientY;
		currentY = startY;
		lastTouchTime = Date.now();
		lastTouchY = startY;

		// iOS Safariでのスクロール防止
		event.preventDefault();
	};

	// タッチ移動
	const handleTouchMove = (event: TouchEvent) => {
		if (!isDragging || !cardElement) return;

		currentY = event.touches[0].clientY;
		const deltaY = currentY - startY;

		// カードの高さを取得
		const cardHeight = cardElement.offsetHeight;

		// 現在の状態に応じてベース位置を決定
		let basePosition: number;
		if (isExpanded) {
			basePosition = 0; // 展開時は0%がベース
		} else {
			basePosition = 50; // 通常時は50%がベース
		}

		// 指の移動量を直接ピクセル値で適用
		const baseOffsetPx = cardHeight * (basePosition / 100);
		const newOffsetPx = baseOffsetPx + deltaY;

		// ピクセル値をカード高さに対するパーセンテージに変換
		if (deltaY < 0) {
			// 上方向：完全に1:1
			translateY = (newOffsetPx / cardHeight) * 100;
		} else {
			// 下方向：抵抗感を追加

			translateY = (newOffsetPx / cardHeight) * 100;
		}

		event.preventDefault();
	};

	// タッチ終了
	const handleTouchEnd = (_event: TouchEvent) => {
		if (!isDragging) return;

		isDragging = false;
		const deltaY = currentY - startY;
		const now = Date.now();
		const timeDelta = now - lastTouchTime;
		const velocity = Math.abs(deltaY) / timeDelta;

		// 現在の位置を基準に判定
		if (isExpanded) {
			// 展開状態の場合
			if (translateY > 25 || (deltaY > SWIPE_THRESHOLD && velocity > VELOCITY_THRESHOLD)) {
				// 下にスワイプまたは25%より下 → 折りたたみ
				collapseCard();
			} else {
				// そのまま展開状態を維持
				expandCard();
			}
		} else {
			// 折りたたみ状態の場合
			if (translateY < 25 || (deltaY < -SWIPE_THRESHOLD && velocity > VELOCITY_THRESHOLD)) {
				// 上にスワイプまたは25%より上 → 展開
				expandCard();
			} else {
				// そのまま折りたたみ状態を維持
				collapseCard();
			}
		}
	};

	// カード展開
	const expandCard = () => {
		isExpanded = true;
		// 現在位置から展開位置へ滑らかに移動
		if (translateY > 0) {
			translateY = 0;
		}
	};

	// カード折りたたみ
	const collapseCard = () => {
		isExpanded = false;
		translateY = 50;
	};

	// マウスイベント（デスクトップ用）
	let isMouseDown = $state(false);

	const handleMouseDown = (event: MouseEvent) => {
		isMouseDown = true;
		startY = event.clientY;
		currentY = startY;
		isDragging = true;
	};

	const handleMouseMove = (event: MouseEvent) => {
		if (!isMouseDown || !isDragging || !cardElement) return;

		currentY = event.clientY;
		const deltaY = currentY - startY;
		const cardHeight = cardElement.offsetHeight;

		// マウスでも同じロジックを適用
		let basePosition = isExpanded ? 0 : 50;
		const baseOffsetPx = cardHeight * (basePosition / 100);
		const newOffsetPx = baseOffsetPx + deltaY;

		if (deltaY < 0) {
			translateY = (newOffsetPx / cardHeight) * 100;
		} else {
			const resistedOffsetPx = baseOffsetPx + deltaY * 0.3;
			translateY = (resistedOffsetPx / cardHeight) * 100;
		}
	};

	const handleMouseUp = () => {
		if (!isMouseDown) return;

		isMouseDown = false;
		isDragging = false;
		const deltaY = currentY - startY;

		// マウスでも同じ判定ロジック
		if (isExpanded) {
			if (translateY > 25 || deltaY > SWIPE_THRESHOLD) {
				collapseCard();
			} else {
				expandCard();
			}
		} else {
			if (translateY < 25 || deltaY < -SWIPE_THRESHOLD) {
				expandCard();
			} else {
				collapseCard();
			}
		}
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
</script>

<!-- スワイプ可能なカード -->
<div
	bind:this={cardElement}
	class="absolute bottom-0 h-[calc(100%_-_50px)] w-full touch-none overflow-hidden rounded-[20px_20px_0_0] bg-white shadow-[0_-4px_20px_rgba(0,_0,_0,_0.15)] {!isDragging
		? 'transition-transform duration-300 ease-out'
		: ''}"
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
		<div class="handle-bar h-1 w-10 rounded bg-gray-500"></div>
	</div>
	{translateY}

	<!-- カードコンテンツ -->
	<div class="p-2"></div>
</div>
