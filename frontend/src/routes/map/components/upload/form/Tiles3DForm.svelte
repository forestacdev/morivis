<script lang="ts">
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createTiles3DEntry } from '$routes/map/data/entries/model';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { fetchTileset3DBbox } from '$routes/map/utils/tiles3d/bounds';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		remoteTiles3dUrl: string | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		remoteTiles3dUrl = $bindable()
	}: Props = $props();

	const validation = yup.object().shape({
		name: yup.string().required('データ名を入力してください。'),
		tileUrl: yup
			.string()
			.required('タイルセットのURLを入力してください。')
			.test('url-format', 'URLの形式が正しくありません', (value) => {
				if (!value) return true;
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

	const getNameFromUrl = (url: string): string => {
		try {
			const pathname = new URL(url).pathname;
			const segments = pathname
				.split('/')
				.map((segment) => decodeURIComponent(segment))
				.filter(Boolean);
			const namedSegment = [...segments]
				.reverse()
				.find((segment) => !/[{}]/.test(segment) && segment.toLowerCase() !== 'tileset.json');
			return namedSegment?.replace(/\.[^.]+$/, '') || '3D Tiles';
		} catch {
			return '3D Tiles';
		}
	};

	$effect(() => {
		if (remoteTiles3dUrl) {
			forms.tileUrl = remoteTiles3dUrl;
			if (!forms.name) {
				forms.name = getNameFromUrl(remoteTiles3dUrl);
			}
			remoteTiles3dUrl = null;
		}
	});

	$effect(() => {
		try {
			validation.validateSync(forms, { abortEarly: false });
			isDisabled = false;
			errors = {};
		} catch (error) {
			isDisabled = true;
			const newErrors: Record<string, string> = {};
			if (error instanceof yup.ValidationError && error.inner && Array.isArray(error.inner)) {
				error.inner.forEach((err: yup.ValidationError) => {
					if (err.path) {
						newErrors[err.path] = err.message;
					}
				});
			}
			errors = newErrors;
		}
	});

	const registration = async () => {
		const url = forms.tileUrl.trim();
		isProcessing.set(true);

		try {
			const { bbox, error } = await fetchTileset3DBbox(url);
			if (!bbox) {
				showNotification(
					error ?? 'tileset.json を取得できなかったため、3D Tiles を登録しませんでした',
					'error'
				);
				return;
			}

			const entry = createTiles3DEntry(forms.name, url, bbox);
			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				remoteTiles3dUrl = null;
			}
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		showDialogType = null;
		remoteTiles3dUrl = null;
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
