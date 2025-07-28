<script lang="ts">
	import * as yup from 'yup';

	import type { DialogType } from '$routes/map/types';
	import ShapeFileFormInput from './ShapeFileFormInput.svelte';
	import { createGeoJsonEntry } from '$routes/map/data';
	import { geometryTypeToEntryType } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing, useEventTrigger } from '$routes/stores/ui';
	import { shpFileToGeojson } from '$routes/map/utils/file/shp';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { readPrjFileContent, transformBbox } from '$routes/map/utils/proj';
	import turfBbox from '@turf/bbox';

	import type { UseEventTriggerType } from '$routes/map/types/ui';
	import { fade } from 'svelte/transition';
	import { isBboxValid } from '$routes/map/utils/map';
	import FileForm from '$routes/map/components/atoms/FileForm.svelte';

	import gsap from 'gsap';

	import * as THREE from 'three';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		showZoneForm: boolean; // 座標系フォームの表示状態
		selectedEpsgCode: EpsgCode; // 選択されたEPSGコード
		focusBbox: [number, number, number, number] | null; // フォーカスするバウンディングボックス
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable()
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
				.optional()
				.test('fileType', '対応していないファイル形式です (許可: .prj)', (value) => {
					console.log(value);
					if (value instanceof File) {
						return value.name.endsWith('.prj');
					}
					return true; // ファイルが選択されていない場合はバリデーションをパス
				}),
			shxFile: yup
				.mixed()
				.required('ファイルを選択してください')
				.test('fileType', '対応していないファイル形式です (許可: .shx)', (value) => {
					if (value instanceof File) {
						return value.name.endsWith('.shx');
					}
					return true; // ファイルが選択されていない場合はバリデーションをパス
				}),
			shpName: yup.string().required('ファイル名が検出できません'),
			dbfName: yup.string().required('ファイル名が検出できません'),
			shxName: yup.string().required('ファイル名が検出できません'),
			prjName: yup.string().optional()
		})
		.test(
			'filenames-match', // テスト名
			'各ファイル名が一致しません', // エラーメッセージ
			(values) => {
				if (!values.shpName || !values.dbfName || !values.prjName || !values.shxName) {
					return true; // いずれかの名前がない場合は、個別のrequiredエラーで処理される
				}

				const shpBaseName = values.shpName.replace(/\.shp$/i, '');
				const dbfBaseName = values.dbfName.replace(/\.dbf$/i, '');
				const prjBaseName = values.prjName.replace(/\.prj$/i, '');
				const shxBaseName = values.shxName.replace(/\.shx$/i, '');

				return (
					shpBaseName === dbfBaseName && shpBaseName === prjBaseName && shpBaseName === shxBaseName
				);
			}
		);

	type ShpFormSchema = yup.InferType<typeof shpValidation>;

	let forms = $state<ShpFormSchema>({
		shpFile: null,
		dbfFile: null,
		shxFile: null,
		prjFile: '',
		shpName: '',
		dbfName: '',
		shxName: '',
		prjName: ''
	});

	const resetForms = () => {
		forms.shpFile = null;
		forms.dbfFile = null;
		forms.shxFile = null;
		forms.prjFile = '';
		forms.shpName = '';
		forms.dbfName = '';
		forms.shxName = '';
		forms.prjName = '';
	};

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
		const fileName = file.name;

		if (fileName.endsWith('.shp')) {
			forms.shpFile = file;
			forms.shpName = fileName;
		} else if (fileName.endsWith('.dbf')) {
			forms.dbfFile = file;
			forms.dbfName = fileName;
		} else if (fileName.endsWith('.prj')) {
			forms.prjFile = file;
			forms.prjName = fileName;
		} else if (fileName.endsWith('.shx')) {
			forms.shxFile = file;
			forms.shxName = fileName;
		} else {
			showNotification('対応していないファイル形式です', 'error');
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

	const setEntryData = async (_prjContent: string) => {
		isProcessing.set(true);
		const geojsonData = await shpFileToGeojson(
			forms.shpFile as File,
			forms.dbfFile as File,
			_prjContent
		);
		// フォームのデータをエントリに設定
		const entryGeometryType = geometryTypeToEntryType(geojsonData);

		if (!entryGeometryType) {
			showNotification('対応していないジオメトリタイプです', 'error');
			return;
		}

		const entry = createGeoJsonEntry(geojsonData, entryGeometryType, forms.shpName);
		if (entry) {
			showDataEntry = entry;
			showDialogType = null;
		}
		isProcessing.set(false);
	};

	const registration = async () => {
		// NOTE: .shxファイルは仕様必須であるが、この処理では使用しないため、バリデーションから除外
		if (!forms.shpFile || !forms.dbfFile || !forms.shxFile) return;

		if (!forms.prjFile) {
			// 世界測地系かどうかを確認
			const geojsonData = await shpFileToGeojson(forms.shpFile as File);
			if (!geojsonData) {
				showNotification('シェープファイルの読み込みに失敗しました', 'error');
				return;
			}
			const bbox = turfBbox(geojsonData);

			if (!isBboxValid(bbox as [number, number, number, number])) {
				showZoneForm = true;
				focusBbox = bbox as [number, number, number, number];
				return;
			}

			// bboxが有効な場合は、座標系フォームを表示せずにエントリを作成
			const prjContent = getProjContext('4326');

			setEntryData(prjContent);
			return;
		}

		const prjContent = await readPrjFileContent(forms.prjFile as File);
		setEntryData(prjContent);
	};

	const cancel = () => {
		showDialogType = null;
	};

	useEventTrigger.subscribe((eventName: UseEventTriggerType) => {
		if (eventName === 'setZone') {
			// 座標系フォームが表示された場合、選択されたEPSGコードを使用してエントリを作成
			const prjContent = getProjContext(selectedEpsgCode);
			if (prjContent) {
				setEntryData(prjContent);
			}
		}
	});

	let distance = $state<number>(0); // 円の半径

	$effect(() => {
		if (showDialogType === 'shp') {
			// ダイアログが表示されるときに距離を更新
			distance = 100; // 必要に応じて調整
		} else {
			distance = 0; // ダイアログが非表示のときは距離をリセット
		}
	});

	const clock = new THREE.Clock();

	// const animate = () => {
	// 	requestAnimationFrame(animate);
	// 	const elapsedTime = clock.getElapsedTime();
	// 	const loadingItems = document.querySelectorAll('.loading-item');
	// 	loadingItems.forEach((item, index) => {
	// 		distance = 300 + Math.sin(elapsedTime + index) * 50; // 距離をアニメーションで変化させる
	// 	});
	// 	// ここで必要なアニメーション処理を追加
	// };
	// animate();

	$effect(() => {
		if (showDialogType !== 'shp') {
			// ダイアログが非表示になったときにアニメーションを停止
			resetForms();
		}
	});

	$effect(() => {
		if (
			forms.shpFile &&
			forms.dbfFile &&
			forms.shxFile &&
			forms.shpName &&
			forms.dbfName &&
			forms.shxName &&
			forms.prjFile &&
			forms.prjName
		) {
			if (hasFilenameMatchError) return;
			registration();
		}
	});
</script>

{#if showDialogType && showDialogType === 'shp'}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute bottom-0 z-30 grid h-full w-full place-items-center bg-black/70
         {showZoneForm ? 'pointer-events-none opacity-0' : ''}"
	>
		<div class="flex shrink-0 items-center justify-between overflow-auto pb-4 pt-8">
			<span class="text-2xl font-bold text-white">シェープファイルの登録</span>
		</div>

		<!-- TODO 表現方法 -->
		<!-- 
		<div
			class="c-main relative m-0 grid aspect-square h-[400px] place-items-center"
			style="--distance: 100px;"
		>
			<div class="c-triangle"></div>
			<div class="c-file-item" style="--index: 0;">
				<ShapeFileFormInput
					label=".shp"
					bind:file={forms.shpFile}
					accept=".shp"
					error={errors.shpFile}
					bind:name={forms.shpName}
				/>
			</div>
			<div class="c-file-item" style="--index: 1;">
				<ShapeFileFormInput
					label=".dbf"
					bind:file={forms.dbfFile}
					accept=".dbf"
					error={errors.dbfFile}
					bind:name={forms.dbfName}
				/>
			</div>
			<div class="c-file-item" style="--index: 2;">
				<ShapeFileFormInput
					label=".shx"
					bind:file={forms.shxFile}
					accept=".shx"
					error={errors.shxFile}
					bind:name={forms.shxName}
				/>
			</div>
			<div class="absolute" style="--index: 2;">
				<ShapeFileFormInput
					label=".prj(任意)"
					bind:file={forms.prjFile}
					accept=".prj"
					error={errors.prjFile}
					bind:name={forms.prjName}
				/>
			</div>
		</div> -->
		<div class="flex gap-2">
			<ShapeFileFormInput
				label=".shp"
				bind:file={forms.shpFile}
				accept=".shp"
				error={errors.shpFile}
				bind:name={forms.shpName}
			/>

			<ShapeFileFormInput
				label=".dbf"
				bind:file={forms.dbfFile}
				accept=".dbf"
				error={errors.dbfFile}
				bind:name={forms.dbfName}
			/>

			<ShapeFileFormInput
				label=".shx"
				bind:file={forms.shxFile}
				accept=".shx"
				error={errors.shxFile}
				bind:name={forms.shxName}
			/>

			<ShapeFileFormInput
				label=".prj(任意)"
				bind:file={forms.prjFile}
				accept=".prj"
				error={errors.prjFile}
				bind:name={forms.prjName}
			/>
			{hasFilenameMatchError ? 'ファイル名が一致しません' : ''}
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
	</div>
{/if}

<style>
	.c-main {
		animation: spin 0.3s;
		transform-origin: center center;
	}

	@keyframes spin {
		0% {
			/* rotate: 0deg; */
			scale: 0.5;
			opacity: 0; /* アニメーションの開始時に透明にする */
		}
		100% {
			/* rotate: 360deg; */
			scale: 1; /* アニメーションの終わりで元のサイズに戻す */
		}
	}
	.c-triangle {
		--size: 320px;
		background: var(--color-main);
		border-radius: 9999px;
		/* clip-path: polygon(50% 0, 100% 100%, 0 100%); */
		width: var(--size);
		aspect-ratio: 1 / 1;
		/* translate: 0 -30px; */
	}

	.c-file-item {
		padding: 0;
		margin-top: 0;
		position: absolute;
		height: 200px;

		width: 130px;
		background: var(--color-main);
		border-radius: 9999px;
		--angle: calc(360deg / 3 * var(--index) - 90deg);
		--x: calc(cos(var(--angle)) * 100px);
		--y: calc(sin(var(--angle)) * 100px);
		translate: calc(var(--x)) calc(var(--y));
		rotate: calc(var(--angle) + 90deg);
	}
</style>
