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

	const shpValidation = yup
		.object()
		.shape({
			shpFile: yup
				.mixed()
				.required('ファイルを選択してください')
				.test('fileType', '対応していないファイル形式です (許可: .shp)', (value) => {
					if (value instanceof File) {
						return value.name.endsWith('.shp');
					}
					return true; // ファイルが選択されていない場合はバリデーションをパス
				}),
			dbfFile: yup
				.mixed()
				.required('ファイルを選択してください')
				.test('fileType', '対応していないファイル形式です (許可: .dbf)', (value) => {
					if (value instanceof File) {
						return value.name.endsWith('.dbf');
					}
					return true; // ファイルが選択されていない場合はバリデーションをパス
				}),
			prjFile: yup
				.mixed()
				.required('ファイルを選択してください')
				.test('fileType', '対応していないファイル形式です (許可: .prj)', (value) => {
					if (value instanceof File) {
						return value.name.endsWith('.prj');
					}
					return true; // ファイルが選択されていない場合はバリデーションをパス
				}),
			shpName: yup.string().required('ファイル名が検出できません'),
			dbfName: yup.string().required('ファイル名が検出できません'),
			prjName: yup.string().required('ファイル名が検出できません')
		})
		.test(
			'filenames-match', // テスト名
			'各ファイル名が一致しません', // エラーメッセージ
			(values) => {
				if (!values.shpName || !values.dbfName || !values.prjName) {
					return true; // いずれかの名前がない場合は、個別のrequiredエラーで処理される
				}

				const shpBaseName = values.shpName.replace(/\.shp$/i, ''); // 拡張子を除去 (大文字小文字を区別しない)
				const dbfBaseName = values.dbfName.replace(/\.dbf$/i, '');
				const prjBaseName = values.prjName.replace(/\.prj$/i, '');

				return shpBaseName === dbfBaseName && shpBaseName === prjBaseName;
			}
		);

	type ShpFormSchema = yup.InferType<typeof shpValidation>;

	let setFileName = $state<string>('');

	let forms = $state<ShpFormSchema>({
		shpFile: null,
		dbfFile: null,
		prjFile: null,
		shpName: '',
		dbfName: '',
		prjName: ''
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

		if (fileName.endsWith('.shp')) {
			forms.shpFile = file;
			forms.shpName = fileName;
		} else if (fileName.endsWith('.dbf')) {
			forms.dbfFile = file;
			forms.dbfName = fileName;
		} else if (fileName.endsWith('.prj')) {
			forms.prjFile = file;
			forms.prjName = fileName;
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
	let hasFilenameMatchError = $state<string>('');

	$effect(() => {
		shpValidation
			.validate(forms, { abortEarly: false })
			.then(() => {
				isDisabled = false;
				hasFilenameMatchError = '';
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
						if (err.type === 'filenames-match') {
							hasFilenameMatchError = err.message;
						}
					});
				}

				errors = newErrors;
			});
	});

	const registration = async () => {
		if (!forms.shpFile || !forms.dbfFile || !forms.prjFile) return;
		const geojsonData = await shpFileToGeojson(
			forms.shpFile as File,
			forms.dbfFile as File,
			forms.prjFile as File
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
	<FileForm
		label=".shp"
		bind:file={forms.shpFile}
		accept=".shp"
		error={errors.shpFile}
		bind:name={forms.shpName}
	/>
	<FileForm
		label=".dbf"
		bind:file={forms.dbfFile}
		accept=".dbf"
		error={errors.dbfFile}
		bind:name={forms.dbfName}
	/>
	<FileForm
		label=".prj"
		bind:file={forms.prjFile}
		accept=".prj"
		error={errors.prjFile}
		bind:name={forms.prjName}
	/>
</div>
<div></div>
{hasFilenameMatchError}
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
