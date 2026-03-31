<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import * as yup from 'yup';

	import ShapeFileFormInput from './ShapeFileFormInput.svelte';

	import DropContainer from '$routes/map/components/DropContainer.svelte';
	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import { geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { shpFileToGeojson, readCpgEncoding } from '$routes/map/utils/file/shp';
	import { isBboxValid, isBbox2D } from '$routes/map/utils/map';
	import { readPrjFileContent } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		showZoneForm: boolean; // 座標系フォームの表示状態
		selectedEpsgCode: EpsgCode; // 選択されたEPSGコード
		focusBbox: [number, number, number, number] | null; // フォーカスするバウンディングボックス
		isDragover: boolean;
		zoneConfirmedEpsg: EpsgCode | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		isDragover = $bindable(),
		zoneConfirmedEpsg = $bindable()
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
				.nullable()
				.optional()
				.test('fileType', '対応していないファイル形式です (許可: .prj)', (value) => {
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
				if (!values.shpName || !values.dbfName || !values.shxName) {
					return true; // いずれかの名前がない場合は、個別のrequiredエラーで処理される
				}

				const shpBaseName = values.shpName.replace(/\.shp$/i, '');
				const dbfBaseName = values.dbfName.replace(/\.dbf$/i, '');
				const shxBaseName = values.shxName.replace(/\.shx$/i, '');

				// prjは任意なので、存在する場合のみチェック
				if (values.prjName) {
					const prjBaseName = values.prjName.replace(/\.prj$/i, '');
					if (shpBaseName !== prjBaseName) {
						return false;
					}
				}

				return shpBaseName === dbfBaseName && shpBaseName === shxBaseName;
			}
		);

	type ShpFormSchema = {
		shpFile: File | null;
		dbfFile: File | null;
		shxFile: File | null;
		prjFile: File | null;
		shpName: string;
		dbfName: string;
		shxName: string;
		prjName: string;
	};

	let cpgFile = $state<File | null>(null);
	let cpgName = $state<string>('');

	let forms = $state<ShpFormSchema>({
		shpFile: null,
		dbfFile: null,
		shxFile: null,
		prjFile: null,
		shpName: '',
		dbfName: '',
		shxName: '',
		prjName: ''
	});

	const resetForms = () => {
		forms.shpFile = null;
		forms.dbfFile = null;
		forms.shxFile = null;
		forms.prjFile = null;
		forms.shpName = '';
		forms.dbfName = '';
		forms.shxName = '';
		forms.prjName = '';
		cpgFile = null;
		cpgName = '';
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
		} else if (fileName.endsWith('.cpg')) {
			cpgFile = file;
			cpgName = fileName;
		} else {
			showNotification('対応していないファイル形式です', 'error');
		}
	};

	const isShapeFileRelated = (file: File | FileList): boolean => {
		const files = file instanceof FileList ? Array.from(file) : [file];
		return files.some((f) => /\.(shp|dbf|prj|shx|cpg)$/i.test(f.name));
	};

	$effect(() => {
		if (dropFile && isShapeFileRelated(dropFile)) {
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
		const encoding = cpgFile ? await readCpgEncoding(cpgFile) : undefined;
		const geojsonData = await shpFileToGeojson(
			forms.shpFile as File,
			forms.dbfFile as File,
			_prjContent,
			encoding
		);
		// フォームのデータをエントリに設定
		const entryGeometryType = geometryTypeToEntryType(geojsonData);

		if (!entryGeometryType) {
			showNotification('対応していないジオメトリタイプです', 'error');
			return;
		}

		const bbox = turfBbox(geojsonData);
		if (!isBbox2D(bbox) || !isBboxValid(bbox)) {
			showNotification('ジオメトリの座標系が不明確です。', 'error');
			isProcessing.set(false);
			return;
		}

		const entry = createGeoJsonEntry(
			geojsonData,
			entryGeometryType,
			forms.shpName,
			bbox,
			undefined,
			{ attribution: 'Shapefile' }
		);
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
			const enc = cpgFile ? await readCpgEncoding(cpgFile) : undefined;
			const geojsonData = await shpFileToGeojson(
				forms.shpFile as File,
				forms.dbfFile as File,
				undefined,
				enc
			);
			if (!geojsonData) {
				showNotification('シェープファイルの読み込みに失敗しました', 'error');
				return;
			}
			const bbox = turfBbox(geojsonData);

			if (!isBbox2D(bbox) || !isBboxValid(bbox)) {
				showZoneForm = true;
				focusBbox = isBbox2D(bbox) ? bbox : null;
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
		dropFile = null;
		showDialogType = null;
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'shp') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				const prjContent = getProjContext(epsg);
				if (prjContent) {
					setEntryData(prjContent);
				}
			});
		}
	});

	// 時計回り: shp(上) → prj → shx → dbf → cpg
	const circleItems = [
		{ label: '.shp', accept: '.shp', key: 'shp' },
		{ label: '.prj', accept: '.prj', key: 'prj' },
		{ label: '.shx', accept: '.shx', key: 'shx' },
		{ label: '.dbf', accept: '.dbf', key: 'dbf' },
		{ label: '.cpg', accept: '.cpg', key: 'cpg' }
	];

	// 五角形の外枠（隣接頂点: 0→1→2→3→4→0）
	const pentagonEdges: [number, number][] = [
		[0, 1],
		[1, 2],
		[2, 3],
		[3, 4],
		[4, 0]
	];

	// 内側の三角形（必須3ファイル: shp=0, shx=2, dbf=3）— 各辺を個別に判定
	const triangleEdges: [number, number][] = [
		[0, 2], // shp - shx
		[2, 3], // shx - dbf
		[3, 0] // dbf - shp
	];

	const filesArray = $derived([
		forms.shpFile,
		forms.prjFile,
		forms.shxFile,
		forms.dbfFile,
		cpgFile
	]);

	// セット済みファイルからベース名を取得（拡張子を除去）
	const baseName = $derived.by(() => {
		const names = [forms.shpName, forms.dbfName, forms.shxName, forms.prjName, cpgName];
		const first = names.find((n) => n);
		if (!first) return '';
		return first.replace(/\.[^.]+$/, '');
	});

	// 等間隔で上(-90°)から配置した頂点座標（SVG用、中心200,200）
	const starPoints = $derived(
		circleItems.map((_, i) => {
			const angle = (i * 72 - 90) * (Math.PI / 180);
			return {
				x: 200 + Math.cos(angle) * distance,
				y: 200 + Math.sin(angle) * distance
			};
		})
	);

	let distance = $state<number>(0); // 円の配置距離

	$effect(() => {
		if (showDialogType === 'shp') {
			// ダイアログが表示されるときに距離を更新
			distance = 200; // 必要に応じて調整
		} else {
			distance = 0; // ダイアログが非表示のときは距離をリセット
		}
	});

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
			// registration();
		}
	});
</script>

{#if showDialogType && showDialogType === 'shp'}
	<DropContainer bind:isDragover onDropFile={(files) => (dropFile = files)}>
		<div
			transition:fade={{ duration: 200 }}
			class="absolute bottom-0 z-30 grid h-full w-full place-items-center bg-black/95
         {showZoneForm ? 'pointer-events-none opacity-0' : ''}"
		>
			<div class="flex shrink-0 flex-col items-center overflow-auto pt-8 pb-2">
				<span class="text-2xl font-bold text-white">シェープファイルの登録</span>
				<p class="mt-1 text-sm text-gray-400">ファイルをまとめてドラッグ＆ドロップできます</p>
			</div>

			<div class="shp-circle-layout relative" style="--distance: {distance}px;">
				{#each circleItems as item, i}
					<div
						class="shp-circle-item absolute"
						style="left: {starPoints[i].x}px; top: {starPoints[i]
							.y}px; transform: translate(-50%, -50%);"
					>
						{#if item.key === 'shp'}
							<ShapeFileFormInput
								label={item.label}
								bind:file={forms.shpFile}
								accept={item.accept}
								error={errors.shpFile}
								bind:name={forms.shpName}
								required
							/>
						{:else if item.key === 'dbf'}
							<ShapeFileFormInput
								label={item.label}
								bind:file={forms.dbfFile}
								accept={item.accept}
								error={errors.dbfFile}
								bind:name={forms.dbfName}
								required
							/>
						{:else if item.key === 'shx'}
							<ShapeFileFormInput
								label={item.label}
								bind:file={forms.shxFile}
								accept={item.accept}
								error={errors.shxFile}
								bind:name={forms.shxName}
								required
							/>
						{:else if item.key === 'prj'}
							<ShapeFileFormInput
								label={item.label}
								bind:file={forms.prjFile}
								accept={item.accept}
								error={errors.prjFile}
								bind:name={forms.prjName}
							/>
						{:else if item.key === 'cpg'}
							<ShapeFileFormInput
								label={item.label}
								bind:file={cpgFile}
								accept={item.accept}
								bind:name={cpgName}
							/>
						{/if}
					</div>
				{/each}

				<svg class="pointer-events-none absolute top-0 left-0 h-full w-full" viewBox="0 0 400 400">
					<!-- 1. 五角形の外枠（隣接同士がセットされたら実線） -->
					{#each pentagonEdges as [from, to]}
						{@const bothSet = !!filesArray[from] && !!filesArray[to]}
						<line
							x1={starPoints[from].x}
							y1={starPoints[from].y}
							x2={starPoints[to].x}
							y2={starPoints[to].y}
							stroke={bothSet ? '#3b82f6' : '#ffffff20'}
							stroke-width={bothSet ? 1 : 0.5}
							class="star-line"
							stroke-dasharray={bothSet ? 'none' : '4 4'}
						/>
					{/each}
					<!-- 2. 内側の三角形（各辺は両端がセットされたら実線） -->
					{#each triangleEdges as [from, to]}
						{@const bothSet = !!filesArray[from] && !!filesArray[to]}
						<line
							x1={starPoints[from].x}
							y1={starPoints[from].y}
							x2={starPoints[to].x}
							y2={starPoints[to].y}
							stroke={bothSet ? '#3b82f6' : '#ffffff20'}
							stroke-width={bothSet ? 2 : 1}
							class="star-line"
							stroke-dasharray={bothSet ? 'none' : '4 4'}
						/>
					{/each}
				</svg>

				<!-- 中心: 決定ボタン -->
				<div class="absolute" style="left: 200px; top: 200px; transform: translate(-50%, -50%);">
					<button
						onclick={registration}
						disabled={isDisabled}
						class="c-btn-confirm grid aspect-square w-24 cursor-pointer place-items-center rounded-full text-lg {isDisabled
							? 'cursor-not-allowed opacity-50'
							: ''}"
					>
						決定
					</button>
				</div>
			</div>

			{#if baseName}
				<p class="text-center text-lg text-white">{baseName}</p>
			{/if}

			{#if hasFilenameMatchError}
				<p class="text-center text-sm text-red-500">{hasFilenameMatchError}</p>
			{/if}

			<div class="flex shrink-0 justify-center overflow-auto pt-2">
				<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
			</div>
		</div>
	</DropContainer>
{/if}

<style>
	.shp-circle-layout {
		width: 400px;
		height: 400px;
	}

	.shp-circle-item {
		width: 100px;
		height: 100px;
		transition: transform 0.5s ease;
	}

	.star-line {
		transition:
			x1 0.5s ease,
			y1 0.5s ease,
			x2 0.5s ease,
			y2 0.5s ease,
			stroke 0.3s ease,
			stroke-width 0.3s ease,
			stroke-dasharray 0.3s ease;
	}
</style>
