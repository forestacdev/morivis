<script lang="ts">
	import Icon from '@iconify/svelte';
	import chroma from 'chroma-js';
	import { fly } from 'svelte/transition';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import type { SpritePatternId } from '$routes/map/data/types/vector/pattern';
	import type { VectorLayerType } from '$routes/map/data/types/vector/style';
	import { loadSpriteIcons } from '$routes/map/utils/icon/sprite';
	import type { StyleImage } from '$routes/map/utils/maplibre';
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
		class="group flex cursor-pointer items-center justify-between gap-2 pr-2 transition-colors duration-100"
	>
		{#if label}
			<span class="group-hover:text-accent min-w-0 grow truncate text-base select-none">
				{label}
			</span>
		{/if}
		<div
			class="relative grid h-[30px] w-[30px] shrink-0 place-items-center overflow-hidden rounded-full {value ===
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
			class="relative cursor-pointer place-items-center h-[40px] w-[40px] overflow-hidden grid group"
			onclick={() => {
				value = color;
				showColorPallet = false;
			}}
			aria-label="Select color {color}"
		>
			<div
				class="absolute h-[30px] w-[30px] rounded-full lg:group-hover:scale-110 transition-transform"
				style="background-color: {color}"
			></div>
			{#if value === color}
				<div
					class="absolute rounded-full border-2 h-[38px] w-[38px]"
					style="border-color: {color}"
				></div>
			{/if}
		</button>
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
							{#each [...chroma.brewer.Paired] as color (color)}
								{@render colorButton(color)}
							{/each}
							{#each [...chroma.brewer.Set3] as color (color)}
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
								{#each patternBlackList as _pattern (_pattern)}
									{@render patternButton(_pattern)}
								{/each}
								{#each patternWhiteList as _pattern (_pattern)}
									{@render patternButton(_pattern)}
								{/each}
							</div>
						{:else if layerType === 'line' || layerType === 'circle'}
							{#await loadSpriteIcons()}
								<p class="py-4 text-center text-sm" role="status">アイコンを読み込み中…</p>
							{:then icons}
								<div class="grid max-h-64 grid-cols-6 gap-2 overflow-y-auto p-1">
									{#each icons as icon (icon.id)}
										<button
											type="button"
											class="grid h-10 w-full cursor-pointer place-items-center rounded bg-white/80 hover:bg-white {pattern ===
											icon.id
												? 'ring-accent ring-2'
												: ''}"
											onclick={() => {
												pattern = icon.id;
												showColorPallet = false;
											}}
											title={icon.id}
											aria-label={icon.id}
											aria-pressed={pattern === icon.id}
										>
											<img src={icon.src} alt="" class="c-no-drag-icon h-7 w-7 object-contain" />
										</button>
									{:else}
										<p class="col-span-6 py-4 text-center text-sm">アイコンがありません</p>
									{/each}
								</div>
							{:catch}
								<p class="py-4 text-center text-sm" role="alert">
									アイコンを読み込めませんでした。開き直して再試行してください。
								</p>
							{/await}
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
