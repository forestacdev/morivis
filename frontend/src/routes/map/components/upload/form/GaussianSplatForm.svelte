<script lang="ts">
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import { createGaussianSplatEntry } from '$routes/map/data/entries/model';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import {
		inspectGaussianSplatPlyFile,
		type GaussianSplatPlyInspection
	} from '$routes/map/utils/formats/gaussian-splat';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		focusBbox = $bindable()
	}: Props = $props();

	const splatFile = $derived(getFirstUploadFile(dropFile));
	const fileKey = $derived(
		splatFile ? `${splatFile.name}:${splatFile.size}:${splatFile.lastModified}` : null
	);
	let inspectedFileKey = $state<string | null>(null);
	let inspection = $state<GaussianSplatPlyInspection | null>(null);
	let name = $state('');

	$effect(() => {
		if (!splatFile || !fileKey || inspectedFileKey === fileKey) return;
		inspectedFileKey = fileKey;
		inspection = null;
		name = splatFile.name.replace(/\.[^.]+$/, '');
		isProcessing.set(true);
		void inspectGaussianSplatPlyFile(splatFile)
			.then((result) => {
				inspection = result;
			})
			.catch((error) => {
				console.error('3D Gaussian Splatting PLYの判定に失敗しました', error);
				inspection = { kind: 'other-ply' };
			})
			.finally(() => isProcessing.set(false));
	});

	const cancel = () => {
		transformOptionMode = null;
		focusBbox = null;
		showDialogType = null;
		dropFile = null;
	};

	const register = () => {
		if (!splatFile || inspection?.kind !== 'gaussian-splat') return;
		if (!name.trim()) {
			showNotification('データ名を入力してください', 'warning');
			return;
		}
		const center = mapStore.getCenter();
		const entry = createGaussianSplatEntry(
			name.trim(),
			URL.createObjectURL(splatFile),
			{
				lng: center?.lng ?? 0,
				lat: center?.lat ?? 0,
				altitude: 0
			},
			{
				gaussianSplat: {
					splatCount: inspection.splatCount,
					shDegree: inspection.shDegree
				}
			}
		);
		entry.format.sourceFileName = splatFile.name;
		showDataEntry = entry;
		transformOptionMode = 'georef';
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">3D Gaussian Splatting の登録</span>
</div>

{#if splatFile}
	<div class="c-scroll flex h-full w-full grow flex-col gap-4 overflow-x-hidden overflow-y-auto">
		<div class="rounded-md bg-black/15 p-3 text-sm text-gray-200">
			<p>{splatFile.name}</p>
			{#if inspection?.kind === 'gaussian-splat'}
				<p class="mt-2">
					{inspection.splatCount.toLocaleString()} splats / SH {inspection.shDegree}次
				</p>
				<p class="mt-2">登録後に地図上の配置位置を指定します。</p>
			{:else if inspection?.kind === 'super-splat'}
				<p class="mt-2 text-red-300">
					SuperSplat 圧縮 PLY は未対応です。通常 PLY に書き出してください。
				</p>
			{:else if inspection?.kind === 'other-ply'}
				<p class="mt-2 text-red-300">3D Gaussian Splatting の通常 PLY 属性が見つかりません。</p>
			{:else}
				<p class="mt-2">PLYヘッダーを確認しています。</p>
			{/if}
		</div>

		<TextForm label="データ名" bind:value={name} />

		<div class="mt-auto flex justify-end gap-2 pb-2">
			<button class="c-btn-cancel rounded-lg px-4 py-2" onclick={cancel}>キャンセル</button>
			<button
				class="c-btn-confirm rounded-lg px-4 py-2"
				disabled={inspection?.kind !== 'gaussian-splat' || !name.trim()}
				onclick={register}
			>
				配置位置を指定
			</button>
		</div>
	</div>
{:else}
	<p class="text-sm text-red-300">3D Gaussian Splatting PLY が見つかりません。</p>
{/if}
