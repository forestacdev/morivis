<script lang="ts">
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import type { GeoJsonRenderMode } from '$routes/map/components/upload/form/geojson-entry';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		entryName: string;
		selectedGeometryType: string;
		selectedRenderMode: GeoJsonRenderMode;
		/** 表示に使う形式名。KMLなど他形式から使うときに差し替える。 */
		formatLabel?: string;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		entryName,
		selectedGeometryType,
		selectedRenderMode = $bindable(),
		formatLabel = 'GeoJSON',
		onConfirm,
		onCancel
	}: Props = $props();

	const renderModeOptions = [
		{ key: 'geojson', name: '2Dで読み込む' },
		{ key: 'deck', name: '3Dで読み込む' }
	] as const;
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">{formatLabel}の描画方式</span>
</div>

<div class="c-scroll flex h-full w-full grow flex-col gap-4 overflow-auto p-2">
	<p class="text-sm text-gray-300">
		3次元座標を含む{formatLabel}です。平面レイヤーとして読むか、3D表示として読むかを選択してください。
	</p>

	<div class="text-sm text-gray-300">
		<div>データ名: {entryName}</div>
		<div>ジオメトリ: {selectedGeometryType}</div>
	</div>

	<HorizontalSelectBox
		label="描画方式を選択"
		bind:group={selectedRenderMode}
		options={[...renderModeOptions]}
	/>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={onCancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={onConfirm}
		disabled={$isProcessing}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
