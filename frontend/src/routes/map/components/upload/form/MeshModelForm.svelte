<script lang="ts">
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createGlbEntry } from '$routes/map/data/entries/model';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { mapStore } from '$routes/stores/map';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	let isFromFile = $state<boolean>(false);

	const validation = yup.object().shape({
		name: yup.string().required('データ名を入力してください。'),
		url: yup
			.string()
			.required('3DモデルのURLを入力してください。')
			.test('url-format', 'URLまたはファイルが必要です', (value) => {
				if (!value) return false;
				return (
					value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')
				);
			}),
		lng: yup
			.string()
			.required('経度を入力してください。')
			.test('valid-lng', '経度は-180〜180', (v) => {
				const n = Number(v);
				return !isNaN(n) && n >= -180 && n <= 180;
			}),
		lat: yup
			.string()
			.required('緯度を入力してください。')
			.test('valid-lat', '緯度は-90〜90', (v) => {
				const n = Number(v);
				return !isNaN(n) && n >= -90 && n <= 90;
			}),
		altitude: yup
			.string()
			.required('高度を入力してください。')
			.test('valid-num', '数値を入力', (v) => !isNaN(Number(v))),
		scale: yup
			.string()
			.required()
			.test('valid-scale', '0より大きい数値', (v) => {
				const n = Number(v);
				return !isNaN(n) && n > 0;
			}),
		rotationY: yup
			.string()
			.required()
			.test('valid-num', '数値を入力', (v) => !isNaN(Number(v)))
	});

	type FormSchema = yup.InferType<typeof validation>;

	const center = mapStore.getCenter();

	let forms = $state<FormSchema>({
		name: '',
		url: '',
		lng: String(center?.lng ?? 0),
		lat: String(center?.lat ?? 0),
		altitude: '0',
		scale: '1',
		rotationY: '0'
	});

	let isDisabled = $state<boolean>(true);
	let errors = $state<Partial<Record<keyof FormSchema, string>>>({});

	const glbFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	// ドロップファイルからBlobURLを生成
	$effect(() => {
		if (glbFile) {
			const blobUrl = URL.createObjectURL(glbFile);
			forms.url = blobUrl;
			forms.name = glbFile.name.replace(/\.[^.]+$/, '');
			isFromFile = true;
		}
	});

	$effect(() => {
		validation
			.validate(forms, { abortEarly: false })
			.then(() => {
				isDisabled = false;
				errors = {};
			})
			.catch((error) => {
				isDisabled = true;
				const newErrors: Record<string, string> = {};
				if (error.inner && Array.isArray(error.inner)) {
					error.inner.forEach((err: yup.ValidationError) => {
						if (err.path) {
							newErrors[err.path] = err.message;
						}
					});
				}
				errors = newErrors;
			});
	});

	const registration = () => {
		const isObj = glbFile?.name.toLowerCase().endsWith('.obj') ?? false;
		const entry = createGlbEntry(
			forms.name,
			forms.url.trim(),
			{
				lng: Number(forms.lng),
				lat: Number(forms.lat),
				altitude: Number(forms.altitude),
				scale: Number(forms.scale),
				rotationY: Number(forms.rotationY)
			},
			isObj ? 'obj' : 'gltf'
		);
		if (entry) {
			showDataEntry = entry;
			showDialogType = null;
			dropFile = null;
		}
	};

	const cancel = () => {
		showDialogType = null;
		dropFile = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">3Dモデルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={forms.name} label="データ名" error={errors.name} />

	{#if isFromFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {glbFile?.name}
		</div>
	{:else}
		<TextForm bind:value={forms.url} label="3Dモデル URL" error={errors.url} />
	{/if}

	<div class="flex w-full gap-2">
		<label class="flex min-w-0 grow flex-col gap-1">
			<span class="text-sm text-gray-300">経度</span>
			<input
				type="number"
				step="any"
				bind:value={forms.lng}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
			/>
		</label>
		<label class="flex min-w-0 grow flex-col gap-1">
			<span class="text-sm text-gray-300">緯度</span>
			<input
				type="number"
				step="any"
				bind:value={forms.lat}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
			/>
		</label>
		<label class="flex min-w-0 grow flex-col gap-1">
			<span class="text-sm text-gray-300">高度 (m)</span>
			<input
				type="number"
				step="any"
				bind:value={forms.altitude}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
			/>
		</label>
	</div>

	<div class="flex w-full gap-2">
		<label class="flex min-w-0 grow flex-col gap-1">
			<span class="text-sm text-gray-300">スケール</span>
			<input
				type="number"
				step="any"
				min="0.001"
				bind:value={forms.scale}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
			/>
		</label>
		<label class="flex min-w-0 grow flex-col gap-1">
			<span class="text-sm text-gray-300">回転 Y (度)</span>
			<input
				type="number"
				step="any"
				bind:value={forms.rotationY}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
			/>
		</label>
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={isDisabled || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {isDisabled || $isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
