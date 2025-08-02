<script>
	import { onMount } from 'svelte';

	let cardElement = $state(null);
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
	function handleTouchStart(event) {
		isDragging = true;
		startY = event.touches[0].clientY;
		currentY = startY;
		lastTouchTime = Date.now();
		lastTouchY = startY;

		// iOS Safariでのスクロール防止
		event.preventDefault();
	}

	// タッチ移動
	function handleTouchMove(event) {
		if (!isDragging) return;

		event.preventDefault();
		currentY = event.touches[0].clientY;
		const deltaY = currentY - startY;

		// 現在時刻と位置を記録（速度計算用）
		lastTouchTime = Date.now();
		lastTouchY = currentY;

		// 上方向への移動のみ許可
		if (deltaY < 0) {
			const progress = Math.min(Math.abs(deltaY) / window.innerHeight, 1);
			translateY = 50 - progress * 50;
		}
	}

	// タッチ終了
	function handleTouchEnd(event) {
		if (!isDragging) return;

		isDragging = false;
		const deltaY = currentY - startY;
		const now = Date.now();
		const timeDelta = now - lastTouchTime;
		const velocity = Math.abs(deltaY) / timeDelta;

		// スワイプ判定：距離または速度で判断
		if (deltaY < -SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
			// 上にスワイプ → 展開
			expandCard();
		} else {
			// 元の位置に戻す
			collapseCard();
		}
	}

	// カード展開
	function expandCard() {
		isExpanded = true;
		translateY = 0;
	}

	// カード折りたたみ
	function collapseCard() {
		isExpanded = false;
		translateY = 50;
	}

	// 背景クリックで閉じる
	function handleBackdropClick() {
		if (isExpanded) {
			collapseCard();
		}
	}

	// マウスイベント（デスクトップ用）
	let isMouseDown = $state(false);

	function handleMouseDown(event) {
		isMouseDown = true;
		startY = event.clientY;
		currentY = startY;
		isDragging = true;
	}

	function handleMouseMove(event) {
		if (!isMouseDown || !isDragging) return;

		currentY = event.clientY;
		const deltaY = currentY - startY;

		if (deltaY < 0) {
			const progress = Math.min(Math.abs(deltaY) / window.innerHeight, 1);
			translateY = 50 - progress * 50;
		}
	}

	function handleMouseUp() {
		if (!isMouseDown) return;

		isMouseDown = false;
		isDragging = false;
		const deltaY = currentY - startY;

		if (deltaY < -SWIPE_THRESHOLD) {
			expandCard();
		} else {
			collapseCard();
		}
	}

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

<!-- 背景（展開時のオーバーレイ） -->
{#if isExpanded}
	<div
		class="backdrop"
		onclick={handleBackdropClick}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Escape' && handleBackdropClick()}
	></div>
{/if}

<!-- メインコンテンツ -->
<div class="main-content">
	<h1>🌲 Morivis</h1>
	<p>森林WebGISアプリケーション</p>
	<div class="features">
		<div class="feature-card">🔍 森林探索</div>
		<div class="feature-card">📊 データ分析</div>
		<div class="feature-card">🗺️ 地形確認</div>
	</div>
</div>

<!-- スワイプ可能なカード -->
<div
	bind:this={cardElement}
	class="swipe-card"
	class:expanded={isExpanded}
	style="transform: translateY({translateY}%)"
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	onmousedown={handleMouseDown}
	role="button"
	tabindex="0"
>
	<!-- ハンドルバー -->
	<div class="handle">
		<div class="handle-bar"></div>
	</div>

	<!-- カードコンテンツ -->
	<div class="card-content">
		<h2>🌲 森林データ</h2>

		{#if !isExpanded}
			<!-- 折りたたみ時のプレビュー -->
			<div class="preview">
				<p>👆 上にスワイプして詳細を表示</p>
				<div class="preview-items">
					<div class="preview-item">🌿 植生情報</div>
					<div class="preview-item">📏 地形データ</div>
					<div class="preview-item">🛤️ アクセス路</div>
				</div>
			</div>
		{:else}
			<!-- 展開時の詳細コンテンツ -->
			<div class="expanded-content">
				<div class="data-section">
					<h3>🌿 植生情報</h3>
					<div class="data-grid">
						<div class="data-item">
							<span class="label">スギ林</span>
							<span class="value">45%</span>
						</div>
						<div class="data-item">
							<span class="label">ヒノキ林</span>
							<span class="value">30%</span>
						</div>
						<div class="data-item">
							<span class="label">広葉樹</span>
							<span class="value">25%</span>
						</div>
					</div>
				</div>

				<div class="data-section">
					<h3>📏 地形データ</h3>
					<div class="data-grid">
						<div class="data-item">
							<span class="label">平均標高</span>
							<span class="value">450m</span>
						</div>
						<div class="data-item">
							<span class="label">最大傾斜</span>
							<span class="value">35°</span>
						</div>
						<div class="data-item">
							<span class="label">面積</span>
							<span class="value">120ha</span>
						</div>
					</div>
				</div>

				<div class="action-buttons">
					<button class="action-btn primary">📊 詳細分析</button>
					<button class="action-btn secondary">🗺️ マップ表示</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		overflow-x: hidden;
	}

	.backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.3);
		z-index: 998;
		backdrop-filter: blur(4px);
	}

	.main-content {
		padding: 60px 20px 20px;
		text-align: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		min-height: 60vh;
	}

	.main-content h1 {
		font-size: 2.5rem;
		margin-bottom: 10px;
		font-weight: 600;
	}

	.main-content p {
		font-size: 1.1rem;
		opacity: 0.9;
		margin-bottom: 40px;
	}

	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 15px;
		max-width: 400px;
		margin: 0 auto;
	}

	.feature-card {
		background: rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		padding: 20px 10px;
		font-size: 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.swipe-card {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		border-radius: 20px 20px 0 0;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
		transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		z-index: 999;
		max-height: 90vh;
		overflow-y: auto;
		touch-action: none; /* スクロール防止 */
	}

	.swipe-card.expanded {
		transform: translateY(0) !important;
		height: 90vh;
	}

	.handle {
		padding: 12px 0 8px;
		display: flex;
		justify-content: center;
		cursor: grab;
	}

	.handle:active {
		cursor: grabbing;
	}

	.handle-bar {
		width: 40px;
		height: 4px;
		background: #ddd;
		border-radius: 2px;
	}

	.card-content {
		padding: 0 20px 30px;
	}

	.card-content h2 {
		margin: 0 0 20px;
		font-size: 1.5rem;
		color: #333;
	}

	.preview {
		text-align: center;
	}

	.preview p {
		color: #666;
		margin-bottom: 20px;
		font-size: 0.9rem;
	}

	.preview-items {
		display: flex;
		justify-content: space-around;
		gap: 10px;
	}

	.preview-item {
		background: #f5f5f5;
		padding: 12px 8px;
		border-radius: 8px;
		font-size: 0.8rem;
		flex: 1;
	}

	.expanded-content {
		animation: fadeIn 0.3s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.data-section {
		margin-bottom: 25px;
	}

	.data-section h3 {
		margin: 0 0 15px;
		font-size: 1.1rem;
		color: #333;
	}

	.data-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 12px;
	}

	.data-item {
		background: #f8f9fa;
		padding: 15px 12px;
		border-radius: 8px;
		text-align: center;
		border: 1px solid #e9ecef;
	}

	.data-item .label {
		display: block;
		font-size: 0.8rem;
		color: #666;
		margin-bottom: 5px;
	}

	.data-item .value {
		display: block;
		font-size: 1.1rem;
		font-weight: 600;
		color: #333;
	}

	.action-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 30px;
	}

	.action-btn {
		padding: 15px 20px;
		border: none;
		border-radius: 10px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn.primary {
		background: #667eea;
		color: white;
	}

	.action-btn.primary:hover {
		background: #5a6fd8;
		transform: translateY(-1px);
	}

	.action-btn.secondary {
		background: #f8f9fa;
		color: #333;
		border: 1px solid #ddd;
	}

	.action-btn.secondary:hover {
		background: #e9ecef;
		transform: translateY(-1px);
	}

	/* モバイル最適化 */
	@media (max-width: 768px) {
		.swipe-card.expanded {
			height: 95vh;
		}

		.data-grid {
			grid-template-columns: 1fr;
		}

		.action-buttons {
			grid-template-columns: 1fr;
		}
	}

	/* スクロールバーのスタイリング */
	.swipe-card::-webkit-scrollbar {
		width: 4px;
	}

	.swipe-card::-webkit-scrollbar-track {
		background: #f1f1f1;
	}

	.swipe-card::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: 2px;
	}
</style>
