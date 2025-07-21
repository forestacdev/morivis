<script lang="ts">
	import * as yup from 'yup';

	import type { DialogType } from '$routes/map/types';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createRasterEntry } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { parseWmtsCapabilities } from '$routes/map/utils/file/wmts';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let { showDataEntry = $bindable(), showDialogType = $bindable() }: Props = $props();

	const WmtsValidation = yup.object().shape({
		url: yup.string().required('URLを入力してください。')
	});

	type WmtsFormSchema = yup.InferType<typeof WmtsValidation>;

	let forms = $state<WmtsFormSchema>({
		url: ''
	});

	let isDisabled = $state<boolean>(true);
	let errors = $state<Partial<Record<keyof WmtsFormSchema, string>>>({});

	$effect(() => {
		WmtsValidation.validate(forms, { abortEarly: false })
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

	const registration = async () => {
		forms.url = forms.url.trim();
		const hoge = await parseWmtsCapabilities(forms.url);
		console.log(hoge);
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">WMS/WMTSの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-y-auto overflow-x-hidden"
>
	<TextForm bind:value={forms.url} label="タイルURL" error={errors.url} />
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
