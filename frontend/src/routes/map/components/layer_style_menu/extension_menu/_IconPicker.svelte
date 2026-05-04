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
		pattern: SpritePatternId | null;
		layerType?: VectorLayerType;
	}
	let { label, pattern = $bindable(), layerType }: Props = $props();

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

	type IconTab = 'point' | 'gsi';
	let activeTab = $state<IconTab>('point');

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
		return createIconImage(image);
	});

	let showColorPallet = $state<boolean>(false);
	let containerRef = $state<HTMLElement>();

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
		<div class="relative grid h-[30px] w-[30px] place-items-center overflow-hidden">
			{#if imageSrc}
				<img src={imageSrc} alt="pattern" class="absolute h-full" />
			{/if}
			<!-- <input type="color" class="invisible" bind:value /> -->
			<input type="checkbox" class="invisible" bind:checked={showColorPallet} />
		</div>
	</label>

	{#if showColorPallet}
		<!-- ポイントアイコン選択UI -->
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="bg-sub absolute z-20 mt-2 w-full rounded-lg p-3 shadow-lg"
		>
			<!-- NOTE:patternが存在するかどうか -->
			{#if pattern && layerType === 'circle'}
				<HorizontalSelectBox
					bind:group={activeTab}
					options={[
						{ key: 'point', name: 'ポイント' },
						{ key: 'gsi', name: '地図記号' }
					]}
				/>
				<div class="mt-2 max-h-[300px] overflow-y-auto">
					{#if activeTab === 'point'}
						<div class="grid grid-cols-10 gap-1">
							{#each POINT_SHAPES as shape}
								{#each POINT_COLORS as color}
									{@const _pattern = `tmpoint-${shape}-${color}` as SpritePatternId}
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
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
</style>
