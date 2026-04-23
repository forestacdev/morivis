<script lang="ts">
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createTiles3DEntry } from '$routes/map/data/entries/model';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { fetchTileset3DBbox } from '$routes/map/utils/tiles3d/bounds';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let { showDataEntry = $bindable(), showDialogType = $bindable() }: Props = $props();

	const validation = yup.object().shape({
		name: yup.string().required('データ名を入力してください。'),
		tileUrl: yup
			.string()
			.required('タイルセットのURLを入力してください。')
			.test('url-format', 'URLの形式が正しくありません', (value) => {
				if (!value) return false;
				return value.startsWith('http://') || value.startsWith('https://');
			})
	});

	type FormSchema = yup.InferType<typeof validation>;

	let forms = $state<FormSchema>({
		name: '',
		tileUrl: ''
	});

	let isDisabled = $state<boolean>(true);
	let errors = $state<Partial<Record<keyof FormSchema, string>>>({});

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

	const registration = async () => {
		const url = forms.tileUrl.trim();
		isProcessing.set(true);

		try {
			const bbox = await fetchTileset3DBbox(url);
			const entry = createTiles3DEntry(forms.name, url, bbox ?? undefined);
			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
			}
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">3D Tilesの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={forms.name} label="データ名" error={errors.name} />
	<TextForm bind:value={forms.tileUrl} label="tileset.json URL" error={errors.tileUrl} />
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
