<script lang="ts">
	import type { SpritePatternId } from '$routes/map/data/types/vector/pattern';
	import { mapStore } from '$routes/stores/map';
	import type { StyleImage } from 'maplibre-gl';

	interface Props {
		label?: string | null;
		value: string;
		pattern?: SpritePatternId; // Optional patterns for the color picker
	}
	let { label, value = $bindable(), pattern = $bindable() }: Props = $props();

	interface MapLibreImageData {
		data: {
			width: number;
			height: number;
			data: Record<string, number>;
		};
		pixelRatio: number;
		spriteData: any;
	}

	interface TileOptions {
		tileCount?: number;
		spacing?: number;
		backgroundColor?: string;
		className?: string;
		alt?: string;
		style?: Partial<CSSStyleDeclaration>;
	}

	/**
	 * MapLibreのImageDataから4つ並べたパターン画像を生成
	 */
	function createTiledPatternImage(
		imageData: StyleImage,
		options: TileOptions = {}
	): string | null {
		try {
			const { tileCount = 16, spacing = 0, backgroundColor = 'transparent' } = options;

			const { width, height, data } = imageData.data;

			if (!width || !height || !data) {
				throw new Error('Invalid image data structure');
			}

			// 元画像のUint8ClampedArrayを作成
			const sourceArray = new Uint8ClampedArray(width * height * 4);
			for (let i = 0; i < width * height * 4; i++) {
				sourceArray[i] = data[i.toString()] || 0;
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
	}

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
</script>

<label
	class="hover:text-accent flex cursor-pointer items-center justify-between transition-colors duration-100"
>
	{#if label}
		<span class="select-none text-base">{label}</span>
	{/if}
	<div
		class="relative grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-full"
		style="background-color: {value}"
	>
		{#if imageSrc}
			<img src={imageSrc} alt="pattern" class="absolute h-full" />
		{/if}
		<input type="color" class="custom-color invisible" bind:value />
	</div>
</label>

<style>
</style>
