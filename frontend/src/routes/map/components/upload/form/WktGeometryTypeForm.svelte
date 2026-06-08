<script lang="ts">
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		selectedGeometryType: VectorEntryGeometryType | '';
		geometryTypeOptions: { key: string; name: string }[];
		sourceEpsgCode?: string | null;
		onBack: () => void;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		selectedGeometryType = $bindable(),
		geometryTypeOptions,
		sourceEpsgCode = null,
		onBack,
		onConfirm,
		onCancel
	}: Props = $props();
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">WKTのジオメトリ選択</span>
</div>

<div class="c-scroll flex h-full w-full grow flex-col gap-4 overflow-auto p-2">
	<p class="text-sm text-gray-300">
		複数のジオメトリタイプが含まれています。読み込むタイプを1つ選択してください。
	</p>

	{#if sourceEpsgCode}
		<p class="text-sm text-gray-300">SRID: EPSG:{sourceEpsgCode}</p>
	{/if}

	<HorizontalSelectBox
		label="ジオメトリタイプを選択"
		bind:group={selectedGeometryType}
		bind:options={geometryTypeOptions}
	/>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={onCancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={onConfirm}
		disabled={$isProcessing || !selectedGeometryType}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!selectedGeometryType
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
