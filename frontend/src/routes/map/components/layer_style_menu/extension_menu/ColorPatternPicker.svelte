<script lang="ts">
	import Icon from '@iconify/svelte';
	import chroma from 'chroma-js';
	import type { StyleImage } from 'maplibre-gl';
	import { fly } from 'svelte/transition';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import type { SpritePatternId } from '$routes/map/data/types/vector/pattern';
	import type { VectorLayerType } from '$routes/map/data/types/vector/style';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		label?: string | null;
		value: string;
		pattern?: SpritePatternId | null;
		layerType?: VectorLayerType;
	}
	let { label, value = $bindable(), pattern = $bindable(), layerType }: Props = $props();

	const patternBlackList: SpritePatternId[] = [
		'tmpoly-caret-200-black',
		'tmpoly-circle-alt-light-200-black',
		'tmpoly-circle-alt-medium-200-black',
		'tmpoly-circle-bold-200-black',
		'tmpoly-circle-heavy-200-black',
		'tmpoly-circle-light-200-black',
		'tmpoly-circle-medium-200-black',
		'tmpoly-crosshatch-light-200-black',
		'tmpoly-crosshatch-medium-200-black',
		'tmpoly-grid-light-200-black',
		'tmpoly-grid-medium-200-black',
		'tmpoly-line-horizontal-light-200-black',
		'tmpoly-line-horizontal-medium-200-black',
		'tmpoly-line-vertical-down-light-200-black',
		'tmpoly-line-vertical-down-medium-200-black',
		'tmpoly-line-vertical-light-200-black',
		'tmpoly-line-vertical-medium-200-black',
		'tmpoly-line-vertical-up-light-200-black',
		'tmpoly-line-vertical-up-medium-200-black',
		'tmpoly-minus-200-black',
		'tmpoly-plus-200-black',
		'tmpoly-slash-back-200-black',
		'tmpoly-slash-forward-200-black',
		'tmpoly-square-200-black'
	];

	const patternWhiteList: SpritePatternId[] = [
		'tmpoly-caret-200-white',
		'tmpoly-circle-alt-light-200-white',
		'tmpoly-circle-alt-medium-200-white',
		'tmpoly-circle-bold-200-white',
		'tmpoly-circle-heavy-200-white',
		'tmpoly-circle-light-200-white',
		'tmpoly-circle-medium-200-white',
		'tmpoly-crosshatch-light-200-white',
		'tmpoly-crosshatch-medium-200-white',
		'tmpoly-grid-light-200-white',
		'tmpoly-grid-medium-200-white',
		'tmpoly-line-horizontal-light-200-white',
		'tmpoly-line-horizontal-medium-200-white',
		'tmpoly-line-vertical-down-light-200-white',
		'tmpoly-line-vertical-down-medium-200-white',
		'tmpoly-line-vertical-light-200-white',
		'tmpoly-line-vertical-medium-200-white',
		'tmpoly-line-vertical-up-light-200-white',
		'tmpoly-line-vertical-up-medium-200-white',
		'tmpoly-minus-200-white',
		'tmpoly-plus-200-white',
		'tmpoly-slash-back-200-white',
		'tmpoly-slash-forward-200-white',
		'tmpoly-square-200-white'
	];

	interface TileOptions {
		tileCount?: number;
		spacing?: number;
		backgroundColor?: string;
		className?: string;
		alt?: string;
		style?: Partial<CSSStyleDeclaration>;
	}

	/**
	 * MapLibreのImageDataから4つ並べたパターン画像を生成 TODO: 最適化
	 */
	const createTiledPatternImage = (
		imageData: StyleImage,
		options: TileOptions = {}
	): string | null => {
		try {
			const { tileCount = 25, spacing = 0, backgroundColor = 'transparent' } = options;

			const { width, height, data } = imageData.data;

			if (!width || !height || !data) {
				throw new Error('Invalid image data structure');
			}

			// 元画像のUint8ClampedArrayを作成
			const sourceArray = new Uint8ClampedArray(width * height * 4);
			for (let i = 0; i < width * height * 4; i++) {
				sourceArray[i] = data[i] || 0;
			}

			// 元のImageDataオブジェクトを作成
			const sourceImageData = new ImageData(sourceArray, width, height);

			// タイル配置の計算（2x2配置）
			const tilesPerRow = Math.ceil(Math.sqrt(tileCount));
			const tilesPerCol = Math.ceil(tileCount / tilesPerRow);

			// 新しいCanvasサイズを計算
			const newWidth = width * tilesPerRow + spacing * (tilesPerRow - 1);
			const newHeight = height * tilesPerCol + spacing * (tilesPerCol - 1);

			// 大きなCanvasを作成
			const canvas = document.createElement('canvas');
			canvas.width = newWidth;
			canvas.height = newHeight;
			const ctx = canvas.getContext('2d');

			if (!ctx) {
				throw new Error('Could not get 2D context');
			}

			// 背景色を設定
			if (backgroundColor !== 'transparent') {
				ctx.fillStyle = backgroundColor;
				ctx.fillRect(0, 0, newWidth, newHeight);
			}

			// 一時的なCanvasで元画像を作成
			const tempCanvas = document.createElement('canvas');
			tempCanvas.width = width;
			tempCanvas.height = height;
			const tempCtx = tempCanvas.getContext('2d');

			if (!tempCtx) {
				throw new Error('Could not get temporary 2D context');
			}

			tempCtx.putImageData(sourceImageData, 0, 0);

			// 4つの位置に画像を配置
			for (let i = 0; i < tileCount; i++) {
				const row = Math.floor(i / tilesPerRow);
				const col = i % tilesPerRow;

				const x = col * (width + spacing);
				const y = row * (height + spacing);

				ctx.drawImage(tempCanvas, x, y);
			}

			return canvas.toDataURL('image/png');
		} catch (error) {
			console.error('Error creating tiled pattern image:', error);
			return null;
		}
	};

	const POINT_SHAPES = [
		'asterisk',
		'circle',
		'hexagon',
		'octagon',
		'oval-h',
		'oval-v',
		'parallelogram',
		'pentagon',
		'rectangle-h',
		'rectangle-v',
		'rhombus',
		'semicircle-bottom',
		'semicircle-top',
		'square',
		'squiggle',
		'star',
		'starburst',
		'trapezoid',
		'triangle-down',
		'triangle-up'
	] as const;

	const POINT_COLORS = [
		'blue',
		'brown',
		'green',
		'grey',
		'orange',
		'pink',
		'purple',
		'red',
		'slime',
		'teal'
	] as const;

	type PointColor = (typeof POINT_COLORS)[number];
	type PointColorFilter = PointColor | 'other';

	const POINT_COLOR_HEX_MAP: Record<PointColor, string> = {
		blue: '#3b82f6',
		brown: '#8b5e3c',
		green: '#22c55e',
		grey: '#6b7280',
		orange: '#f97316',
		pink: '#ec4899',
		purple: '#a855f7',
		red: '#ef4444',
		slime: '#84cc16',
		teal: '#14b8a6'
	};

	/** 国土地理院 地図記号アイコン */
	const GSI_ICONS = [
		'交番',
		'保健所',
		'博物館法の登録博物館・博物館相当施設',
		'図書館',
		'外国公館',
		'官公署',
		'寺院',
		'小学校',
		'中学校',
		'高等学校・中等教育学校',
		'市役所・東京都の区役所',
		'町村役場・政令指定都市の区役所',
		'消防署',
		'警察署',
		'郵便局',
		'病院',
		'老人ホーム',
		'裁判所',
		'税務署',
		'神社',
		'城跡',
		'史跡・名勝・天然記念物',
		'自然災害伝承碑',
		'記念碑',
		'温泉',
		'噴火口・噴気口',
		'灯台',
		'墓地',
		'煙突',
		'電波塔',
		'風車',
		'油井・ガス井',
		'工場',
		'発電所等',
		'採鉱地',
		'港湾',
		'漁港',
		'滝',
		'三角点',
		'水準点',
		'電子基準点',
		'標高点（測点）',
		'特別標高点',
		'指示点',
		'田',
		'畑',
		'果樹園',
		'茶畑',
		'広葉樹林',
		'針葉樹林',
		'竹林',
		'ヤシ科樹林',
		'ハイマツ地',
		'笹地',
		'荒地',
		'砂礫地（領域が不明瞭な場合）',
		'植生界',
		'流水方向'
	] as const;

	/**
	 * スプライト画像データからdata URL PNGを生成する（単体アイコン用）
	 */
	const createIconImage = (imageData: StyleImage): string | null => {
		try {
			const { width, height, data } = imageData.data;

			if (!width || !height || !data) return null;
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return null;
			const arr = new Uint8ClampedArray(width * height * 4);
			for (let i = 0; i < arr.length; i++) arr[i] = data[i] || 0;
			ctx.putImageData(new ImageData(arr, width, height), 0, 0);
			return canvas.toDataURL('image/png');
		} catch {
			return null;
		}
	};

	let imageSrc = $derived.by(() => {
		if (!pattern) return null;
		const image = mapStore.getImage(pattern);
		if (!image) return null;
		if (layerType === 'fill') {
			// 塗りつぶしパターンはタイル状に配置して表示
			return createTiledPatternImage(image);
		} else {
			// ラインやポイントのパターンは単体で表示
			return createIconImage(image);
		}
	});

	let showColorPallet = $state<boolean>(false);

	let containerRef = $state<HTMLElement>();

	let selectedType = $state<'color' | 'pattern'>('color');
	let selectedPointColor = $state<PointColorFilter>('blue');

	let filteredPointPatterns = $derived.by(() => {
		if (selectedPointColor === 'other') return [];

		return POINT_SHAPES.map((shape) => `tmpoint-${shape}-${selectedPointColor}` as SpritePatternId);
	});

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showColorPallet && containerRef && !containerRef.contains(event.target as Node)) {
				showColorPallet = false;
			}
		};

		if (showColorPallet) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div bind:this={containerRef} class="relative">
	<label
		class="group flex cursor-pointer items-center justify-between pr-2 transition-colors duration-100"
	>
		{#if label}
			<span class="group-hover:text-accent text-base select-none">{label}</span>
		{/if}
		<div
			class="relative grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-full {value ===
			'transparent'
				? 'border border-white'
				: ''}}"
			style="background-color: {value}"
		>
			{#if imageSrc}
				<img
					src={imageSrc}
					alt="pattern"
					class="c-no-drag-icon absolute object-contain {layerType !== 'fill'
						? 'h-[90%]'
						: 'h-full'}"
				/>
			{/if}
			<!-- <input type="color" class="invisible" bind:value /> -->
			<input type="checkbox" class="invisible" bind:checked={showColorPallet} />
		</div>
	</label>
	{#snippet colorButton(color: string)}
		<button
			class="relative grid h-[30px] w-[30px] cursor-pointer place-items-center overflow-hidden rounded-full"
			style="background-color: {color}"
			onclick={() => {
				value = color;
				showColorPallet = false;
			}}
			aria-label="Select color {color}"
		></button>
	{/snippet}

	<!-- ポリゴンパターン選択UI -->
	{#snippet patternButton(_pattern: SpritePatternId)}
		<button
			class="relative grid h-[30px] w-[30px] cursor-pointer place-items-center overflow-hidden rounded-full"
			style="background-color: {value};"
			onclick={() => {
				pattern = _pattern;
				showColorPallet = false;
			}}
		>
			{#if _pattern}
				<img
					src={createTiledPatternImage(mapStore.getImage(_pattern) as StyleImage)}
					alt="pattern"
					class="c-no-drag-icon absolute h-full"
				/>
			{/if}
		</button>
	{/snippet}

	{#if showColorPallet}
		<!-- カラー選択UI -->
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="bg-sub absolute z-20 mt-2 w-full rounded-lg p-3 shadow-lg"
		>
			<HorizontalSelectBox
				bind:group={selectedType}
				options={[
					{ key: 'color', name: 'カラー' },
					{ key: 'pattern', name: layerType === 'circle' ? 'アイコン' : 'パターン' }
				]}
			/>
			<div class="mt-3">
				{#if selectedType === 'color'}
					<div class="relative flex flex-col gap-3">
						<div class="grid grid-cols-8 gap-2">
							{#each [...chroma.brewer.Paired] as color}
								{@render colorButton(color)}
							{/each}
							{#each [...chroma.brewer.Set3] as color}
								{@render colorButton(color)}
							{/each}
						</div>
						<div class="flex w-full items-center justify-center">
							<button
								class="flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white py-1 pr-3 pl-2 text-black"
								onclick={() => {
									value = 'transparent';
									showColorPallet = false;
								}}
								aria-label="透明"
								><Icon icon="mdi:blood-transparent" class="h-6 w-6" /><span class="text-sm"
									>透明色</span
								></button
							>
						</div>
					</div>
				{:else if selectedType === 'pattern'}
					<div class="relative flex flex-col gap-3">
						{#if layerType === 'fill'}
							<div class="grid grid-cols-8 gap-2">
								{#each patternBlackList as _pattern}
									{@render patternButton(_pattern)}
								{/each}
								{#each patternWhiteList as _pattern}
									{@render patternButton(_pattern)}
								{/each}
							</div>
						{:else if layerType === 'line' || layerType === 'circle'}
							<div class="flex flex-wrap gap-1.5">
								{#each POINT_COLORS as color}
									<button
										class="h-7 w-7 cursor-pointer rounded-lg border-2 transition {selectedPointColor ===
										color
											? 'border-accent scale-110'
											: 'border-transparent'}"
										style="background-color: {POINT_COLOR_HEX_MAP[color]}"
										onclick={() => {
											selectedPointColor = color;
										}}
										aria-label={`${color} のアイコンを表示`}
									></button>
								{/each}
								{#if layerType === 'circle'}
									<button
										class="flex h-7 cursor-pointer items-center rounded-lg border px-2 text-xs transition {selectedPointColor ===
										'other'
											? 'border-accent text-accent'
											: 'border-gray-500 text-white'}"
										onclick={() => {
											selectedPointColor = 'other';
										}}
										aria-label="その他のアイコンを表示"
									>
										その他
									</button>
								{/if}
							</div>
							{#if selectedPointColor !== 'other'}
								<div class="grid grid-cols-10 gap-1">
									{#each filteredPointPatterns as _pattern}
										{@const img = mapStore.getImage(_pattern)}
										<button
											class="grid h-7 w-7 cursor-pointer place-items-center rounded-full {pattern ===
											_pattern
												? 'ring-accent ring-2'
												: ''}"
											onclick={() => {
												pattern = _pattern;
												showColorPallet = false;
											}}
										>
											{#if img}
												<img src={createIconImage(img)} alt={_pattern} class="h-5 w-5" />
											{/if}
										</button>
									{/each}
								</div>
							{:else}
								<div class="grid grid-cols-6 gap-1">
									{#each GSI_ICONS as name}
										{@const _pattern = name as unknown as SpritePatternId}
										{@const img = mapStore.getImage(_pattern)}
										<button
											class="grid h-9 w-9 cursor-pointer place-items-center rounded {pattern ===
											_pattern
												? 'ring-accent ring-2'
												: ''}"
											onclick={() => {
												pattern = _pattern;
												showColorPallet = false;
											}}
											title={name}
										>
											{#if img}
												<img src={createIconImage(img)} alt={name} class="h-7 w-7" />
											{/if}
										</button>
									{/each}
								</div>
							{/if}
						{/if}
						<div class="flex w-full items-center justify-center">
							<button
								class="relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white px-3 py-1"
								onclick={() => {
									pattern = null;
									showColorPallet = false;
								}}
								aria-label="Remove pattern"
								><span class="text-sm text-black"
									>{layerType === 'circle' ? 'アイコンなし' : 'パターンなし'}</span
								></button
							>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
</style>
