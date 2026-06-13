<script lang="ts">
	import Icon from '@iconify/svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import type {
		GeoRefData,
		RasterRegistrationMode
	} from '$routes/map/components/upload/form/GeoRefForm.svelte';

	interface Props {
		geoRefData: GeoRefData;
		bboxDisplay: string;
		canSwitchToZone: boolean;
		onSwitchToZone: () => void;
		registrationModeOptions: { key: RasterRegistrationMode; name: string }[];
	}

	let { geoRefData, bboxDisplay, canSwitchToZone, onSwitchToZone, registrationModeOptions }: Props =
		$props();
</script>

{#if canSwitchToZone}
	<div class="mb-4 grid w-full shrink-0 grid-cols-2 gap-2">
		<button onclick={onSwitchToZone} class="c-btn-sub cursor-pointer p-3 text-base">投影法</button>
		<button class="c-btn-confirm p-3 text-base">位置合わせ</button>
	</div>
{/if}

<div class="flex shrink-0 items-center justify-between gap-2 overflow-auto pb-4">
	<Icon icon="ph:polygon-fill" class="h-8 w-8" />
	<span class="text-2xl font-bold">画像の位置合わせ</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<div class="flex w-full flex-col gap-2 px-2 text-sm text-gray-300">
		<div>ファイル: {geoRefData.imageFile.name}</div>
		<div>サイズ: {geoRefData.imageWidth} × {geoRefData.imageHeight} px</div>
	</div>

	{#if geoRefData.numBands === 1}
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

	<div class="w-full px-2 text-sm text-gray-300">
		<p class="mb-2 text-yellow-400">
			地図上の4つのマーカーをドラッグして画像の範囲を指定してください
		</p>
		<div class="flex flex-col gap-1 text-xs">
			<div>範囲: {bboxDisplay}</div>
		</div>
	</div>
</div>
