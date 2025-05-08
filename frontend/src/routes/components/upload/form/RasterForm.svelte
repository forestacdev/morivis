<script lang="ts">
	import * as yup from 'yup';

	import type { DialogType } from '$routes/+page.svelte';
	import TextForm from '$routes/components/atoms/TextForm.svelte';
	import { createRasterEntry } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';
	import { showDataMenu } from '$routes/store';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let { showDataEntry = $bindable(), showDialogType = $bindable() }: Props = $props();

	const rasterValidation = yup.object().shape({
		name: yup.string().required('データ名を入力してください。'),
		tileurl: yup
			.string()
			.required('タイルのURLを入力してください。')
			.test('半角英数のみ', 'ラスタータイルURLは半角英数です。', (value) => {
				return !/[^a-zA-Z0-9!-/:-@¥[-`{-~]+/.test(value);
			})
	});

	type RasterFormSchema = yup.InferType<typeof rasterValidation>;

	let forms = $state<RasterFormSchema>({
		name: '',
		tileurl: ''
	});

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
		forms.tileurl = forms.tileurl.trim();

		const entry = createRasterEntry(forms.name, forms.tileurl);
		if (entry) {
			showDataEntry = entry;
			showDialogType = null;
		}
	};

	const cancel = () => {
		showDialogType = null;
		showDataMenu.set(true);
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">ラスタータイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-y-auto overflow-x-hidden"
>
	<TextForm bind:value={forms.name} label="データ名" error={errors.name} />
	<TextForm bind:value={forms.tileurl} label="タイルURL" error={errors.tileurl} />
</div>
<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-cancel cursor-pointer p-4 text-lg"> キャンセル </button>
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
