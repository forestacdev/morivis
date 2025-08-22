<script lang="ts">
	import { mapStore } from '$routes/stores/map';
	import type { StyleImage } from 'maplibre-gl';
	import chroma from 'chroma-js';
	import type { SpritePatternId } from '$routes/map/data/types/vector/pattern';
	import { fly } from 'svelte/transition';
	import Icon from '@iconify/svelte';

	interface Props {
		label?: string | null;
		value: string;
		pattern?: SpritePatternId | null;
	}
	let { label, value = $bindable(), pattern = $bindable() }: Props = $props();

	const patternList: SpritePatternId[] = [
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

	let imageSrc = $derived.by(() => {
		if (!pattern) return null;
		// パターンIDから画像を取得

		const image = mapStore.getImage(pattern);
		if (!image) {
			console.warn('Image not found for pattern');
			return null;
		}
		// 画像データを取得してパターン画像を生成
		return createTiledPatternImage(image);
	});

	let showColorPallet = $state<boolean>(false);
	let containerRef = $state<HTMLElement>();
	// if (label === 'スギ') showColorPallet = true; // デバッグ用

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
			<span class="group-hover:text-accent select-none text-base">{label}</span>
		{/if}
		<div
			class="relative grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-full {value ===
			'transparent'
				? 'border-1 border-white'
				: ''}"
			style="background-color: {value}"
		>
			{#if imageSrc}
				<img src={imageSrc} alt="pattern" class="absolute h-full" />
			{/if}
			<!-- <input type="color" class="invisible" bind:value /> -->
			<input type="checkbox" class="invisible" bind:checked={showColorPallet} />
		</div>
	</label>
	{#if showColorPallet}
		<!-- カラー選択UI -->
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="bg-sub absolute z-10 mt-2 grid w-full rounded-lg shadow-lg"
		>
			<div class="grid grid-cols-8 gap-2 p-2">
				{#each [...chroma.brewer.Paired, ...chroma.brewer.Set3] as color}
					<button
						class="relative grid h-[30px] w-[30px] cursor-pointer place-items-center overflow-hidden rounded-full"
						style="background-color: {color}"
						onclick={() => {
							value = color;
							showColorPallet = false;
						}}
						aria-label="Select color {color}"
					></button>
				{/each}
			</div>
			<div class="flex w-full items-center justify-center pb-2">
				<button
					class="relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white px-2 py-1"
					onclick={() => {
						value = 'transparent';
						showColorPallet = false;
					}}
					aria-label="透明"
					><Icon icon="mdi:blood-transparent" class="h-6 w-6" /><span class="text-sm">透明</span
					></button
				>
			</div>
			<!-- TODO:ラインやポイントのパターン選択UIを追加 -- >
			<!-- NOTE:patternが存在するかどうか -->
			{#if pattern || pattern === null}
				<div class="bg-base h-[1px] w-full"></div>
				<div class="grid grid-cols-8 gap-2 p-2">
					{#each patternList as _pattern}
						<button
							class="relative grid h-[30px] w-[30px] cursor-pointer place-items-center overflow-hidden rounded-full bg-white"
							onclick={() => {
								pattern = _pattern;
								showColorPallet = false;
							}}
						>
							{#if _pattern}
								<img
									src={createTiledPatternImage(mapStore.getImage(_pattern) as StyleImage)}
									alt="pattern"
									class="absolute h-full"
								/>
							{/if}</button
						>
					{/each}
				</div>
				<div class="flex w-full items-center justify-center pb-2">
					<button
						class="relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white px-3 py-2"
						onclick={() => {
							pattern = null;
							showColorPallet = false;
						}}
						aria-label="Remove pattern"><span class="text-sm">パターンなし</span></button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
</style>
