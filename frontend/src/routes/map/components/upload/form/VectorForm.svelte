<script lang="ts">
	import * as yup from 'yup';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createVectorTileEntry } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let { showDataEntry = $bindable(), showDialogType = $bindable() }: Props = $props();

	const rasterValidation = yup.object().shape({
		name: yup.string().required('データ名を入力してください。'),
		tileUrl: yup
			.string()
			.required('タイルのURLを入力してください。')
			.test('半角英数のみ', 'ラスタータイルURLは半角英数です。', (value) => {
				return !/[^a-zA-Z0-9!-/:-@¥[-`{-~]+/.test(value);
			}),
		source: yup
			.string()
			.required('ソースレイヤーを入力してください。')
			.test('半角英数のみ', 'ソースレイヤーは半角英数です。', (value) => {
				return !/[^a-zA-Z0-9!-/:-@¥[-`{-~]+/.test(value);
			})
	});

	type RasterFormSchema = yup.InferType<typeof rasterValidation>;

	let forms = $state<RasterFormSchema>({
		name: '',
		tileUrl: '',
		source: ''
	});

	let geometryType = $state<VectorEntryGeometryType>('Point');
	let geometryTypesOptions = $state<
		{
			key: string;
			name: string;
		}[]
	>([
		{ key: 'Point', name: 'ポイント' },
		{ key: 'LineString', name: 'ライン' },
		{ key: 'Polygon', name: 'ポリゴン' }
	]);

	let isDisabled = $state<boolean>(true);
	let errors = $state<Partial<Record<keyof RasterFormSchema, string>>>({});

	$effect(() => {
		rasterValidation
			.validate(forms, { abortEarly: false })
			.then(() => {
				isDisabled = false;
				errors = {}; // バリデーション成功時はエラーをクリア
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
		forms.tileUrl = forms.tileUrl.trim();
		forms.source = forms.source.trim();

		const entry = createVectorTileEntry(forms.name, forms.tileUrl, forms.source, geometryType);
		if (entry) {
			showDataEntry = entry;
			showDialogType = null;
		}
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">ベクタータイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={forms.name} label="データ名" error={errors.name} />
	<TextForm bind:value={forms.tileUrl} label="タイルURL" error={errors.tileUrl} />
	<TextForm bind:value={forms.source} label="ソースレイヤー" error={errors.source} />
</div>
<div class="p-2">
	<HorizontalSelectBox
		label="ジオメトリタイプ"
		bind:group={geometryType}
		options={geometryTypesOptions}
	/>
</div>
<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={isDisabled}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {isDisabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
