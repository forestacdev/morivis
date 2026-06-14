<script lang="ts">
	import Icon from '@iconify/svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import type {
		GeoRefData,
		GeoRefTransformMode,
		RasterRegistrationMode
	} from '$routes/map/components/upload/form/transform/georef-types';

	interface Props {
		geoRefData: GeoRefData;
		bboxDisplay: string;
		cornerDisplay: { label: string; value: [number, number] }[];
		centerDisplay: [number, number];
		geoRefTransformMode: GeoRefTransformMode;
		previewOpacity: number;
		registrationModeOptions: { key: RasterRegistrationMode; name: string }[];
		onRefit: () => void;
	}

	let {
		geoRefData,
		bboxDisplay,
		cornerDisplay,
		centerDisplay,
		geoRefTransformMode = $bindable(),
		previewOpacity = $bindable(),
		registrationModeOptions,
		onRefit
	}: Props = $props();

	const transformModeOptions: { key: GeoRefTransformMode; name: string }[] = [
		{ key: 'aspect-locked', name: '縦横比固定' },
		{ key: 'projective', name: '自由変形' }
	];
</script>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<div class="flex w-full flex-col gap-2 px-2 text-sm text-gray-300">
		<div>ファイル: {geoRefData.imageFile.name}</div>
		<div>サイズ: {geoRefData.imageWidth} × {geoRefData.imageHeight} px</div>
	</div>

	{#if geoRefData.sourceType === 'raster' && geoRefData.numBands === 1 && geoRefData.allowRegistrationModeChange !== false}
		<div class="w-full px-2">
			<HorizontalSelectBox
				label="登録方法"
				options={registrationModeOptions}
				bind:group={geoRefData.registrationMode}
			/>
			<p class="mt-2 text-xs text-gray-400">
				3Dメッシュは 1 バンド値を高さとして GLB に変換して登録します
			</p>
		</div>
	{/if}

	<div class="w-full px-2">
		<HorizontalSelectBox
			label="位置合わせ"
			options={transformModeOptions}
			bind:group={geoRefTransformMode}
		/>
		<p class="mt-2 text-xs text-gray-400">
			縦横比固定では、元画像の比率を保ったまま回転と拡大縮小で合わせます
		</p>
	</div>

	<div class="w-full px-2">
		<RangeSlider
			label="プレビュー透明度"
			bind:value={previewOpacity}
			min={0.1}
			max={1}
			step={0.05}
		/>
	</div>

	<div class="w-full px-2 text-sm text-gray-300">
		<p class="mb-2 text-yellow-400">
			地図上の4つのマーカーをドラッグして画像の範囲を指定してください
		</p>
		<div class="flex flex-col gap-1 text-xs">
			<div>範囲: {bboxDisplay}</div>
			<div>中心: [{centerDisplay[0].toFixed(6)}, {centerDisplay[1].toFixed(6)}]</div>
		</div>
	</div>

	<div class="w-full px-2 text-sm text-gray-300">
		<div class="mb-2 font-bold">四隅座標</div>
		<div class="flex flex-col gap-1 text-xs">
			{#each cornerDisplay as corner (corner.label)}
				<div>{corner.label}: [{corner.value[0].toFixed(6)}, {corner.value[1].toFixed(6)}]</div>
			{/each}
		</div>
	</div>

	<div class="w-full px-2 pb-2">
		<button onclick={onRefit} class="c-btn-sub w-full cursor-pointer p-3 text-sm">
			表示範囲にフォーカス
		</button>
	</div>
</div>
