<script lang="ts">
	import { untrack } from 'svelte';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import { createGlbEntry } from '$routes/map/data/entries/model';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { MeshFormatType } from '$routes/map/data/types/model';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';
	import { computeUploadedModelMetaInWorker } from '$routes/map/utils/three/model-bounds-parallel';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		selectedEpsgCode: EpsgCode;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		selectedEpsgCode
	}: Props = $props();

	interface ModelPlacement {
		name?: string;
		lng: number;
		lat: number;
		altitude: number;
		scale?: number;
	}

	const getPathLikeName = (file: File) => {
		const relativePath = (file as File & { morivisRelativePath?: string }).morivisRelativePath;
		return (relativePath ?? file.name).toLowerCase();
	};

	const getModelPlacement = (file: File): ModelPlacement | undefined => {
		return (file as File & { morivisModelPlacement?: ModelPlacement }).morivisModelPlacement;
	};

	const getMeshFormat = (pathLikeName: string): MeshFormatType => {
		if (pathLikeName.endsWith('.obj')) return 'obj';
		if (pathLikeName.endsWith('.3ds')) return '3ds';
		if (pathLikeName.endsWith('.dae')) return 'dae';
		if (pathLikeName.endsWith('.3dm')) return '3dm';
		if (pathLikeName.endsWith('.fbx')) return 'fbx';
		if (pathLikeName.endsWith('.drc')) return 'drc';
		if (pathLikeName.endsWith('.3mf')) return '3mf';
		if (pathLikeName.endsWith('.amf')) return 'amf';
		if (pathLikeName.endsWith('.ifc')) return 'ifc';
		return 'gltf';
	};

	const supportsResourceUrls = (format: MeshFormatType) => {
		return (
			format === 'obj' ||
			format === '3ds' ||
			format === 'dae' ||
			format === '3dm' ||
			format === 'fbx'
		);
	};

	const inputFiles = $derived.by(() => toUploadFiles(dropFile));

	const glbFile = $derived.by(() => {
		return (
			inputFiles.find((file) =>
				/\.(glb|obj|3ds|dae|3dm|fbx|drc|3mf|amf|ifc)$/i.test(getPathLikeName(file))
			) ?? null
		);
	});

	const activeFormat = $derived(glbFile ? getMeshFormat(getPathLikeName(glbFile)) : null);
	const modelPlacement = $derived(glbFile ? getModelPlacement(glbFile) : undefined);
	const requiresManualRegistration = $derived(activeFormat === 'fbx' && !modelPlacement);

	const mtlFile = $derived.by(() => {
		return inputFiles.find((file) => /\.mtl$/i.test(file.name)) ?? null;
	});

	const textureFiles = $derived.by(() => {
		return inputFiles.filter((file) => /\.(png|jpe?g|bmp|tga|gif|webp)$/i.test(file.name));
	});

	const getRelativePath = (file: File) => {
		const relativePath = (file as File & { morivisRelativePath?: string }).morivisRelativePath;
		return relativePath?.replace(/\\/g, '/');
	};

	const buildResourceUrls = (files: File[]) => {
		const resourceUrls: Record<string, string> = {};
		files.forEach((file) => {
			const blobUrl = URL.createObjectURL(file);
			const relativePath = getRelativePath(file);
			const lowerFileName = file.name.toLowerCase();
			resourceUrls[lowerFileName] = blobUrl;

			if (!relativePath) return;

			const normalizedRelativePath = relativePath.toLowerCase();
			resourceUrls[normalizedRelativePath] = blobUrl;

			const relativeWithoutRoot = normalizedRelativePath.split('/').slice(1).join('/');
			if (relativeWithoutRoot) {
				resourceUrls[relativeWithoutRoot] = blobUrl;
			}
		});
		return resourceUrls;
	};
	const isSameBbox = (
		a: [number, number, number, number] | null,
		b: [number, number, number, number] | null
	) => {
		if (!a || !b) return a === b;
		return a.every((value, index) => value === b[index]);
	};

	let droppedForms = $state({
		name: ''
	});
	let droppedErrors = $state<Partial<Record<'name', string>>>({});
	let preparedDropFileKey = $state<string | null>(null);
	let analyzedDropFileKey = $state<string | null>(null);
	let fbxSourceBbox = $state<[number, number, number, number] | null>(null);
	let isPreparingZoneSelection = $state(false);
	let autoOpenedZoneFileKey = $state<string | null>(null);

	$effect(() => {
		if (!glbFile || !requiresManualRegistration) {
			preparedDropFileKey = null;
			return;
		}

		const nextFileKey = getPathLikeName(glbFile);
		if (preparedDropFileKey === nextFileKey) return;

		preparedDropFileKey = nextFileKey;
		droppedForms = {
			name: glbFile.name.replace(/\.[^.]+$/, '')
		};
		droppedErrors = {};
	});

	$effect(() => {
		if (!glbFile || !requiresManualRegistration || activeFormat !== 'fbx') {
			analyzedDropFileKey = null;
			fbxSourceBbox = null;
			isPreparingZoneSelection = false;
			autoOpenedZoneFileKey = null;
			return;
		}

		const nextFileKey = getPathLikeName(glbFile);
		if (analyzedDropFileKey === nextFileKey) return;

		analyzedDropFileKey = nextFileKey;
		fbxSourceBbox = null;
		isPreparingZoneSelection = true;

		const analyzeSourceBbox = async () => {
			const center = mapStore.getCenter();
			const resourceUrls = textureFiles.length > 0 ? buildResourceUrls(textureFiles) : undefined;
			const entry = createGlbEntry(
				glbFile.name.replace(/\.[^.]+$/, ''),
				'',
				{
					lng: center?.lng ?? 0,
					lat: center?.lat ?? 0,
					altitude: 0
				},
				'fbx',
				undefined,
				resourceUrls,
				undefined
			);

			try {
				isProcessing.set(true);
				const uploadedModelMeta = await computeUploadedModelMetaInWorker({
					file: glbFile,
					format: 'fbx',
					style: entry.style,
					resourceUrls,
					normalizeToLocalOrigin: false
				});

				fbxSourceBbox = uploadedModelMeta.sourceBbox ?? null;
				if (!uploadedModelMeta.sourceBbox) {
					showNotification('FBXの範囲を取得できませんでした', 'error');
				}
			} catch (error) {
				fbxSourceBbox = null;
				console.warn('FBXの範囲解析に失敗しました', error);
				showNotification('FBXの範囲解析に失敗しました', 'error');
			} finally {
				isPreparingZoneSelection = false;
				isProcessing.set(false);
			}
		};

		analyzeSourceBbox();
	});

	$effect(() => {
		if (!glbFile || !requiresManualRegistration || activeFormat !== 'fbx') return;

		const fileKey = getPathLikeName(glbFile);
		if (autoOpenedZoneFileKey === fileKey) return;

		autoOpenedZoneFileKey = fileKey;
		focusBbox = null;
		transformOptionMode = 'zone';
		showNotification('FBXは座標系不明として扱います。座標系を選択してください', 'info');
	});

	const isDroppedRegistrationDisabled = $derived.by(() => {
		return !droppedForms.name.trim() || isPreparingZoneSelection || !fbxSourceBbox;
	});

	const validateDroppedForms = () => {
		const nextErrors: Partial<Record<'name', string>> = {};
		if (!droppedForms.name.trim()) {
			nextErrors.name = 'データ名を入力してください。';
		}

		droppedErrors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	};

	const buildDroppedEntry = async (options?: { name?: string; projectedModelEpsg?: EpsgCode }) => {
		if (!glbFile || !activeFormat) return null;

		const name =
			options?.name?.trim() || modelPlacement?.name?.trim() || glbFile.name.replace(/\.[^.]+$/, '');
		const blobUrl = URL.createObjectURL(glbFile);
		const center = mapStore.getCenter();
		let resolvedMtlUrl: string | undefined;
		let resourceUrls: Record<string, string> | undefined;

		if (textureFiles.length > 0) {
			resourceUrls = buildResourceUrls(textureFiles);
		}
		if (mtlFile) {
			resolvedMtlUrl = URL.createObjectURL(mtlFile);
		}

		const normalizeToLocalOrigin =
			activeFormat === 'ifc' || (activeFormat === 'fbx' && !options?.projectedModelEpsg);
		const entry = createGlbEntry(
			name,
			blobUrl,
			{
				lng: modelPlacement?.lng ?? center?.lng ?? 0,
				lat: modelPlacement?.lat ?? center?.lat ?? 0,
				altitude: modelPlacement?.altitude ?? 0,
				scale: modelPlacement?.scale
			},
			activeFormat,
			resolvedMtlUrl,
			supportsResourceUrls(activeFormat) ? resourceUrls : undefined,
			normalizeToLocalOrigin ? { normalizeToLocalOrigin: true } : undefined
		);

		if (activeFormat === 'ifc') {
			showNotification('IFCの地理配置は行わず、ローカル原点に寄せて表示します', 'info');
		}

		try {
			isProcessing.set(true);
			const uploadedModelMeta = await computeUploadedModelMetaInWorker({
				file: glbFile,
				format: activeFormat,
				style: entry.style,
				resourceUrls,
				normalizeToLocalOrigin: entry.format.normalizeToLocalOrigin,
				projectedModelEpsg: options?.projectedModelEpsg
			});

			if (uploadedModelMeta.resolvedPlacement) {
				entry.style.transform.lng = uploadedModelMeta.resolvedPlacement.lng;
				entry.style.transform.lat = uploadedModelMeta.resolvedPlacement.lat;
				entry.style.transform.altitude = uploadedModelMeta.resolvedPlacement.altitude;
				entry.metaData.altitude = uploadedModelMeta.resolvedPlacement.altitude;
				entry.format.georeference = uploadedModelMeta.resolvedPlacement.georeference;
				showNotification(
					`EPSG:${uploadedModelMeta.resolvedPlacement.georeference.epsg} でFBXを地理配置します`,
					'info'
				);
			}

			if (uploadedModelMeta.hasSkinnedMesh) {
				entry.style.shadingOptions = {
					enabled: false
				};
				if (entry.style.shading) {
					entry.style.shading.enabled = false;
				}
			}
			if (uploadedModelMeta.animationNames.length > 0) {
				entry.properties = {
					...entry.properties,
					animation: {
						clips: uploadedModelMeta.animationNames.map((clipName) => ({ name: clipName }))
					}
				};
				entry.state = {
					...entry.state,
					animation: {
						currentClipIndex: 0,
						playing: false,
						speed: 1
					}
				};
			}
			if (uploadedModelMeta.scaleMultiplier !== 1) {
				entry.style.transform.baseScale =
					(entry.style.transform.baseScale ?? 1) * uploadedModelMeta.scaleMultiplier;
				showNotification('小さいモデルのため拡大して表示します', 'info');
			}
			entry.metaData.bounds = uploadedModelMeta.bounds;
			entry.metaData.xyzImageTile = uploadedModelMeta.xyzImageTile;
		} catch (error) {
			console.warn('3Dモデルの範囲を取得できませんでした', error);
		} finally {
			isProcessing.set(false);
		}

		return entry;
	};

	$effect(() => {
		if (!glbFile || requiresManualRegistration) return;

		const register = async () => {
			const entry = await buildDroppedEntry();
			if (!entry) return;

			showDataEntry = entry;
			showDialogType = null;
			dropFile = null;
		};

		register();
	});

	const registerDroppedFbx = async (projectedModelEpsg: EpsgCode) => {
		if (!validateDroppedForms()) return;

		const entry = await buildDroppedEntry({
			name: droppedForms.name,
			projectedModelEpsg
		});
		if (!entry) return;

		showDataEntry = entry;
		transformOptionMode = null;
		focusBbox = null;
		showDialogType = null;
		dropFile = null;
	};

	const openZoneSelection = () => {
		if (!validateDroppedForms()) return;
		if (!fbxSourceBbox) {
			showNotification('FBXの範囲を取得できませんでした', 'error');
			return;
		}

		focusBbox = fbxSourceBbox;
		transformOptionMode = 'zone';
	};

	$effect(() => {
		if (!glbFile || !requiresManualRegistration || !fbxSourceBbox) return;
		if (isSameBbox(focusBbox, fbxSourceBbox)) return;

		focusBbox = fbxSourceBbox;
	});

	$effect(() => {
		if (!zoneConfirmedEpsg || showDialogType !== 'glb' || !requiresManualRegistration) return;

		const epsg = zoneConfirmedEpsg;
		untrack(() => {
			zoneConfirmedEpsg = null;
			void registerDroppedFbx(epsg);
		});
	});

	const validation = yup.object().shape({
		name: yup.string().required('データ名を入力してください。'),
		url: yup
			.string()
			.required('3DモデルのURLを入力してください。')
			.test('url-format', 'URLの形式が正しくありません', (value) => {
				if (!value) return true;
				return value.startsWith('http://') || value.startsWith('https://');
			})
	});

	let forms = $state({ name: '', url: '' });
	let isDisabled = $state(true);
	let errors = $state<Partial<Record<string, string>>>({});

	$effect(() => {
		validation
			.validate(forms, { abortEarly: false })
			.then(() => {
				isDisabled = false;
				errors = {};
			})
			.catch((error) => {
				isDisabled = true;
				const nextErrors: Record<string, string> = {};
				if (error.inner && Array.isArray(error.inner)) {
					error.inner.forEach((err: yup.ValidationError) => {
						if (err.path) nextErrors[err.path] = err.message;
					});
				}
				errors = nextErrors;
			});
	});

	const registrationFromUrl = () => {
		const center = mapStore.getCenter();
		const format = getMeshFormat(forms.url.trim().toLowerCase());
		const normalizeToLocalOrigin = format === 'ifc' || format === 'fbx';
		const entry = createGlbEntry(
			forms.name,
			forms.url.trim(),
			{
				lng: center?.lng ?? 0,
				lat: center?.lat ?? 0,
				altitude: 0
			},
			format,
			undefined,
			undefined,
			normalizeToLocalOrigin ? { normalizeToLocalOrigin: true } : undefined
		);
		if (entry) {
			showDataEntry = entry;
			showDialogType = null;
		}
	};

	const cancel = () => {
		transformOptionMode = null;
		focusBbox = null;
		showDialogType = null;
		dropFile = null;
	};
</script>

{#if requiresManualRegistration && glbFile}
	<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
		<span class="text-2xl font-bold">FBXファイルの登録</span>
	</div>

	<div
		class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
	>
		<div class="w-full rounded-md bg-black/15 p-3 text-sm text-gray-200">
			<p>{glbFile.name}</p>
			<p class="mt-2">
				FBX は標準では座標系を持たない前提で扱います。既存の投影変換と同じ ZoneMenu
				を自動表示します。
			</p>
			<p class="mt-2">現在の選択: EPSG:{selectedEpsgCode}</p>
			{#if isPreparingZoneSelection}
				<p class="mt-2">FBXの範囲を解析しています。</p>
			{:else if fbxSourceBbox}
				<p class="mt-2">
					範囲: X {fbxSourceBbox[0].toFixed(3)} - {fbxSourceBbox[2].toFixed(3)}, Y {fbxSourceBbox[1].toFixed(
						3
					)} - {fbxSourceBbox[3].toFixed(3)}
				</p>
			{/if}
		</div>
		<TextForm bind:value={droppedForms.name} label="データ名" error={droppedErrors.name} />
	</div>

	<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
		<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
		<button
			onclick={openZoneSelection}
			disabled={isDroppedRegistrationDisabled}
			class="c-btn-confirm min-w-[200px] p-4 text-lg {isDroppedRegistrationDisabled
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer'}"
		>
			座標系を選択
		</button>
	</div>
{:else if !glbFile}
	<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
		<span class="text-2xl font-bold">3Dモデルの登録</span>
	</div>

	<div
		class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
	>
		<TextForm bind:value={forms.name} label="データ名" error={errors.name} />
		<TextForm
			bind:value={forms.url}
			label="3Dモデル URL (GLB / OBJ / 3DS / DAE / 3DM / FBX / DRC / 3MF / AMF / IFC)"
			error={errors.url}
		/>
	</div>

	<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
		<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
		<button
			onclick={registrationFromUrl}
			disabled={isDisabled}
			class="c-btn-confirm min-w-[200px] p-4 text-lg {isDisabled
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer'}"
		>
			決定
		</button>
	</div>
{/if}
