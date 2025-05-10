<script lang="ts">
	import * as yup from 'yup';

	import type { DialogType } from '$routes/+page.svelte';
	import FileForm from '$routes/components/atoms/FileForm.svelte';
	import { createGeoJsonEntry } from '$routes/data';
	import { geometryTypeToEntryType } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';
	import { notificationMessage, showNotification } from '$routes/store/notification';
	import { shpFileToGeojson } from '$routes/utils/shp';

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

	const shpValidation = yup.object().shape({
		shp: yup
			.mixed()
			.required('ファイルを選択してください')
			.test('fileType', '対応していないファイル形式です (許可: .shp)', (value) => {
				if (value instanceof File) {
					return value.name.endsWith('.shp');
				}
				return true; // ファイルが選択されていない場合はバリデーションをパス
			}),
		dbf: yup
			.mixed()
			.required('ファイルを選択してください')
			.test('fileType', '対応していないファイル形式です (許可: .dbf)', (value) => {
				if (value instanceof File) {
					return value.name.endsWith('.dbf');
				}
				return true; // ファイルが選択されていない場合はバリデーションをパス
			}),
		prj: yup
			.mixed()
			.required('ファイルを選択してください')
			.test('fileType', '対応していないファイル形式です (許可: .prj)', (value) => {
				if (value instanceof File) {
					return value.name.endsWith('.prj');
				}
				return true; // ファイルが選択されていない場合はバリデーションをパス
			})
	});

	type ShpFormSchema = yup.InferType<typeof shpValidation>;

	let setFileName = $state<string>('');

	let forms = $state<ShpFormSchema>({
		shp: null,
		dbf: null,
		prj: null
	});

	const setFiles = (dropFile: File | FileList | null) => {
		if (!dropFile) return;

		if (dropFile instanceof File) {
			setFile(dropFile);
		} else if (dropFile instanceof FileList) {
			for (let i = 0; i < dropFile.length; i++) {
				setFile(dropFile[i]);
			}
		}
	};

	const setFile = (file: File) => {
		const fileName = file.name.toLowerCase();

		if (setFileName && setFileName !== fileName) {
			notificationMessage.set({
				message: 'ファイル名が異なります。',
				type: 'error'
			});
		}

		if (fileName.endsWith('.shp')) {
			forms['shp'] = file;
		} else if (fileName.endsWith('.dbf')) {
			forms['dbf'] = file;
		} else if (fileName.endsWith('.prj')) {
			forms['prj'] = file;
		}
	};

	$effect(() => {
		if (dropFile) {
			setFiles(dropFile);
			dropFile = null; // ドロップ後はnullにリセット
		}
	});

	let isDisabled = $state<boolean>(true);
	let errors = $state<Partial<Record<keyof ShpFormSchema, string>>>({});

	$effect(() => {
		shpValidation
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

	$effect(() => {
		if (forms.shp) setFile(forms.shp);
		if (forms.dbf) setFile(forms.dbf);
		if (forms.prj) setFile(forms.prj);
	});

	const registration = async () => {
		if (!forms.shp || !forms.dbf || !forms.prj) return;
		const geojsonData = await shpFileToGeojson(
			forms.shp as File,
			forms.dbf as File,
			forms.prj as File
		);

		const entryGeometryType = geometryTypeToEntryType(geojsonData);

		if (!entryGeometryType) {
			showNotification('対応していないジオメトリタイプです', 'error');
			return;
		}

		const entry = createGeoJsonEntry(geojsonData, entryGeometryType, setFileName);

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
	<span class="text-2xl font-bold">シェープファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-y-auto overflow-x-hidden"
>
	<FileForm label=".shp" bind:file={forms.shp} accept=".shp" error={errors.shp} />
	<FileForm label=".dbf" bind:file={forms.dbf} accept=".dbf" error={errors.dbf} />
	<FileForm label=".prj" bind:file={forms.prj} accept=".prj" error={errors.prj} />
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
