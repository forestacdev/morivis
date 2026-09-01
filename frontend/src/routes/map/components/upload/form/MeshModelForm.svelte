<script lang="ts">
	import { untrack } from 'svelte';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import { createGlbEntry } from '$routes/map/data/entries/model';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { MeshFormatType } from '$routes/map/data/types/model';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { inspectGltfFile } from '$routes/map/utils/formats/gltf';
	import { inspectMtlFile, inspectObjFile } from '$routes/map/utils/formats/obj';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';
	import { applyProjectedModelAxisOverride } from '$routes/map/utils/three/model-axis';
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

	const getProjectedModelEpsg = (file: File): EpsgCode | undefined => {
		return (file as File & { morivisProjectedModelEpsg?: EpsgCode }).morivisProjectedModelEpsg;
	};

	const getMeshFormat = (pathLikeName: string): MeshFormatType => {
		if (pathLikeName.endsWith('.gltf')) return 'gltf';
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
			format === 'gltf' ||
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
				/\.(glb|gltf|obj|3ds|dae|3dm|fbx|drc|3mf|amf|ifc)$/i.test(getPathLikeName(file))
			) ?? null
		);
	});

	const activeFormat = $derived(glbFile ? getMeshFormat(getPathLikeName(glbFile)) : null);
	const modelPlacement = $derived(glbFile ? getModelPlacement(glbFile) : undefined);
	const detectedProjectedModelEpsg = $derived(glbFile ? getProjectedModelEpsg(glbFile) : undefined);

	const mtlFile = $derived.by(() => {
		return inputFiles.find((file) => /\.mtl$/i.test(file.name)) ?? null;
	});

	const textureFiles = $derived.by(() => {
		return inputFiles.filter((file) => /\.(png|jpe?g|bmp|tga|gif|webp)$/i.test(file.name));
	});

	const isJsonGltfFile = $derived(
		!!glbFile && activeFormat === 'gltf' && getPathLikeName(glbFile).endsWith('.gltf')
	);

	const gltfSupplementaryFiles = $derived.by(() => {
		if (!glbFile || !isJsonGltfFile) return [];
		return inputFiles.filter((file) => file !== glbFile);
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

	const buildResourceKeySet = (files: File[]) => {
		const resourceKeys = new Set<string>();
		files.forEach((file) => {
			const relativePath = getRelativePath(file);
			const lowerFileName = file.name.toLowerCase();
			resourceKeys.add(lowerFileName);

			if (!relativePath) return;

			const normalizedRelativePath = relativePath.toLowerCase();
			resourceKeys.add(normalizedRelativePath);

			const relativeWithoutRoot = normalizedRelativePath.split('/').slice(1).join('/');
			if (relativeWithoutRoot) {
				resourceKeys.add(relativeWithoutRoot);
			}
		});
		return resourceKeys;
	};

	const hasMatchingResourceFile = (resourceKeys: Set<string>, pathLikeValue: string) => {
		const normalizedPath = pathLikeValue.replace(/\\/g, '/').trim().toLowerCase();
		const relativeWithoutRoot = normalizedPath.split('/').slice(1).join('/');
		const fileName = normalizedPath.split('/').pop() ?? normalizedPath;
		return (
			resourceKeys.has(normalizedPath) ||
			(relativeWithoutRoot ? resourceKeys.has(relativeWithoutRoot) : false) ||
			resourceKeys.has(fileName)
		);
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
	let objInspectionFileKey = $state<string | null>(null);
	let isInspectingObjReferences = $state(false);
	let referencedObjMaterialLibraries = $state<string[]>([]);
	let mtlInspectionFileKey = $state<string | null>(null);
	let isInspectingMtlReferences = $state(false);
	let referencedMtlTexturePaths = $state<string[]>([]);
	let gltfInspectionFileKey = $state<string | null>(null);
	let isInspectingGltfReferences = $state(false);
	let referencedGltfBufferUris = $state<string[]>([]);
	let referencedGltfImageUris = $state<string[]>([]);

	const requiresFbxManualRegistration = $derived(activeFormat === 'fbx' && !modelPlacement);
	const textureResourceKeys = $derived.by(() => buildResourceKeySet(textureFiles));
	const gltfResourceKeys = $derived.by(() => buildResourceKeySet(gltfSupplementaryFiles));
	const requiresObjMtlResolution = $derived(
		activeFormat === 'obj' && referencedObjMaterialLibraries.length > 0 && !mtlFile
	);
	const missingObjTexturePaths = $derived.by(() => {
		if (!mtlFile || referencedMtlTexturePaths.length === 0) return [];
		return referencedMtlTexturePaths.filter(
			(pathLikeValue) => !hasMatchingResourceFile(textureResourceKeys, pathLikeValue)
		);
	});
	const requiresObjTextureResolution = $derived(
		activeFormat === 'obj' && !!mtlFile && missingObjTexturePaths.length > 0
	);
	const requiresObjSupplementaryResolution = $derived(
		requiresObjMtlResolution || requiresObjTextureResolution
	);
	const missingGltfBufferUris = $derived.by(() => {
		if (!isJsonGltfFile || referencedGltfBufferUris.length === 0) return [];
		return referencedGltfBufferUris.filter(
			(pathLikeValue) => !hasMatchingResourceFile(gltfResourceKeys, pathLikeValue)
		);
	});
	const missingGltfImageUris = $derived.by(() => {
		if (!isJsonGltfFile || referencedGltfImageUris.length === 0) return [];
		return referencedGltfImageUris.filter(
			(pathLikeValue) => !hasMatchingResourceFile(gltfResourceKeys, pathLikeValue)
		);
	});
	const missingGltfResourceUris = $derived.by(() => [
		...missingGltfBufferUris,
		...missingGltfImageUris
	]);
	const requiresGltfSupplementaryResolution = $derived(
		isJsonGltfFile && missingGltfResourceUris.length > 0
	);
	const isWaitingForModelSupplementaryInspection = $derived(
		(!!glbFile &&
			activeFormat === 'obj' &&
			(isInspectingObjReferences || isInspectingMtlReferences)) ||
			(!!glbFile && isJsonGltfFile && isInspectingGltfReferences)
	);
	const requiresModelSupplementaryResolution = $derived(
		requiresObjSupplementaryResolution || requiresGltfSupplementaryResolution
	);
	const requiresManualRegistration = $derived(
		requiresFbxManualRegistration || requiresModelSupplementaryResolution
	);
	const shouldShowDroppedModelPanel = $derived(
		!!glbFile && (requiresManualRegistration || isWaitingForModelSupplementaryInspection)
	);

	$effect(() => {
		if (!shouldShowDroppedModelPanel || !glbFile) {
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
		if (!glbFile || activeFormat !== 'obj') {
			objInspectionFileKey = null;
			isInspectingObjReferences = false;
			referencedObjMaterialLibraries = [];
			return;
		}

		const nextFileKey = getPathLikeName(glbFile);
		if (objInspectionFileKey === nextFileKey) return;

		objInspectionFileKey = nextFileKey;
		isInspectingObjReferences = true;
		referencedObjMaterialLibraries = [];

		const inspectReferences = async () => {
			const inspectionKey = nextFileKey;
			try {
				const inspection = await inspectObjFile(glbFile);
				if (objInspectionFileKey !== inspectionKey) return;
				referencedObjMaterialLibraries = inspection.referencedMaterialLibraries;
			} catch (error) {
				if (objInspectionFileKey !== inspectionKey) return;
				referencedObjMaterialLibraries = [];
				console.warn('OBJ の参照 MTL 判定に失敗しました', error);
			} finally {
				if (objInspectionFileKey === inspectionKey) {
					isInspectingObjReferences = false;
				}
			}
		};

		void inspectReferences();
	});

	$effect(() => {
		if (!glbFile || activeFormat !== 'obj' || !mtlFile) {
			mtlInspectionFileKey = null;
			isInspectingMtlReferences = false;
			referencedMtlTexturePaths = [];
			return;
		}

		const nextFileKey = `${getPathLikeName(glbFile)}::${getPathLikeName(mtlFile)}`;
		if (mtlInspectionFileKey === nextFileKey) return;

		mtlInspectionFileKey = nextFileKey;
		isInspectingMtlReferences = true;
		referencedMtlTexturePaths = [];

		const inspectReferences = async () => {
			const inspectionKey = nextFileKey;
			try {
				const inspection = await inspectMtlFile(mtlFile);
				if (mtlInspectionFileKey !== inspectionKey) return;
				referencedMtlTexturePaths = inspection.referencedTexturePaths;
			} catch (error) {
				if (mtlInspectionFileKey !== inspectionKey) return;
				referencedMtlTexturePaths = [];
				console.warn('MTL の参照画像判定に失敗しました', error);
			} finally {
				if (mtlInspectionFileKey === inspectionKey) {
					isInspectingMtlReferences = false;
				}
			}
		};

		void inspectReferences();
	});

	$effect(() => {
		if (!glbFile || !isJsonGltfFile) {
			gltfInspectionFileKey = null;
			isInspectingGltfReferences = false;
			referencedGltfBufferUris = [];
			referencedGltfImageUris = [];
			return;
		}

		const nextFileKey = getPathLikeName(glbFile);
		if (gltfInspectionFileKey === nextFileKey) return;

		gltfInspectionFileKey = nextFileKey;
		isInspectingGltfReferences = true;
		referencedGltfBufferUris = [];
		referencedGltfImageUris = [];

		const inspectReferences = async () => {
			const inspectionKey = nextFileKey;
			try {
				const inspection = await inspectGltfFile(glbFile);
				if (gltfInspectionFileKey !== inspectionKey) return;
				referencedGltfBufferUris = inspection.externalBufferUris;
				referencedGltfImageUris = inspection.externalImageUris;
			} catch (error) {
				if (gltfInspectionFileKey !== inspectionKey) return;
				referencedGltfBufferUris = [];
				referencedGltfImageUris = [];
				console.warn('glTF の外部参照判定に失敗しました', error);
			} finally {
				if (gltfInspectionFileKey === inspectionKey) {
					isInspectingGltfReferences = false;
				}
			}
		};

		void inspectReferences();
	});

	$effect(() => {
		if (!glbFile || !requiresFbxManualRegistration || activeFormat !== 'fbx') {
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
		if (!glbFile || !requiresFbxManualRegistration || activeFormat !== 'fbx') return;

		const fileKey = getPathLikeName(glbFile);
		if (autoOpenedZoneFileKey === fileKey) return;

		autoOpenedZoneFileKey = fileKey;
		focusBbox = null;
		transformOptionMode = 'zone';
		showNotification('FBXは座標系不明として扱います。座標系を選択してください', 'info');
	});

	const isDroppedRegistrationDisabled = $derived.by(() => {
		if (!droppedForms.name.trim()) return true;
		if (requiresFbxManualRegistration) {
			return isPreparingZoneSelection || !fbxSourceBbox;
		}
		if (requiresModelSupplementaryResolution) {
			return isInspectingObjReferences || isInspectingMtlReferences || isInspectingGltfReferences;
		}
		return false;
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
		const resolvedProjectedModelEpsg =
			options?.projectedModelEpsg ??
			(activeFormat === 'obj' ? detectedProjectedModelEpsg : undefined);
		const blobUrl = URL.createObjectURL(glbFile);
		const center = mapStore.getCenter();
		let resolvedMtlUrl: string | undefined;
		let resourceUrls: Record<string, string> | undefined;
		const resourceFiles = activeFormat === 'gltf' ? gltfSupplementaryFiles : textureFiles;

		if (resourceFiles.length > 0) {
			resourceUrls = buildResourceUrls(resourceFiles);
		}
		if (activeFormat === 'obj' && mtlFile) {
			resolvedMtlUrl = URL.createObjectURL(mtlFile);
		}

		const normalizeToLocalOrigin =
			activeFormat === 'ifc' || (activeFormat === 'fbx' && !resolvedProjectedModelEpsg);
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
			{
				...(normalizeToLocalOrigin ? { normalizeToLocalOrigin: true } : {}),
				sourceFileName: glbFile.name
			}
		);
		applyProjectedModelAxisOverride(
			entry.style.transform,
			activeFormat,
			resolvedProjectedModelEpsg
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
				projectedModelEpsg: resolvedProjectedModelEpsg
			});

			if (uploadedModelMeta.resolvedPlacement) {
				entry.style.transform.lng = uploadedModelMeta.resolvedPlacement.lng;
				entry.style.transform.lat = uploadedModelMeta.resolvedPlacement.lat;
				entry.style.transform.altitude = uploadedModelMeta.resolvedPlacement.altitude;
				entry.metaData.altitude = uploadedModelMeta.resolvedPlacement.altitude;
				entry.format.georeference = uploadedModelMeta.resolvedPlacement.georeference;
				showNotification(
					`EPSG:${uploadedModelMeta.resolvedPlacement.georeference.epsg} で${entry.metaData.attribution}を地理配置します`,
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
		if (activeFormat === 'obj' && (isInspectingObjReferences || isInspectingMtlReferences)) return;
		if (activeFormat === 'gltf' && isInspectingGltfReferences) return;

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
		if (!glbFile || !requiresFbxManualRegistration || !fbxSourceBbox) return;
		if (isSameBbox(focusBbox, fbxSourceBbox)) return;

		focusBbox = fbxSourceBbox;
	});

	$effect(() => {
		if (!zoneConfirmedEpsg || showDialogType !== 'glb' || !requiresFbxManualRegistration) return;

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

	const registerDroppedModelWithoutSupplementaryFiles = async () => {
		if (!validateDroppedForms()) return;

		const entry = await buildDroppedEntry({
			name: droppedForms.name
		});
		if (!entry) return;

		showDataEntry = entry;
		showDialogType = null;
		dropFile = null;
	};
</script>

{#if shouldShowDroppedModelPanel && glbFile}
	<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
		<span class="text-2xl font-bold"
			>{activeFormat === 'fbx'
				? 'FBXファイルの登録'
				: activeFormat === 'gltf'
					? 'glTFファイルの登録'
					: 'OBJファイルの登録'}</span
		>
	</div>

	<div
		class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
	>
		<div class="w-full rounded-md bg-black/15 p-3 text-sm text-gray-200">
			<p>{glbFile.name}</p>
			{#if requiresFbxManualRegistration}
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
			{:else if requiresObjMtlResolution}
				<p class="mt-2">
					この OBJ は `mtllib` で MTL を参照しています。`.mtl`
					とテクスチャ画像を追加ドロップできます。
				</p>
				<p class="mt-2">参照MTL: {referencedObjMaterialLibraries.join(', ')}</p>
				<p class="mt-2">MTL なしのまま登録することもできます。</p>
			{:else if requiresObjTextureResolution}
				<p class="mt-2">
					この MTL はテクスチャ画像を参照しています。画像を追加ドロップするとそのまま続行できます。
				</p>
				<p class="mt-2">参照MTL: {mtlFile?.name}</p>
				<p class="mt-2">未追加画像: {missingObjTexturePaths.join(', ')}</p>
				<p class="mt-2">画像なしのまま登録することもできます。</p>
			{:else if requiresGltfSupplementaryResolution}
				<p class="mt-2">
					この glTF は外部ファイルを参照しています。`.bin`
					や画像を追加ドロップするとそのまま続行できます。
				</p>
				{#if missingGltfBufferUris.length > 0}
					<p class="mt-2">未追加バッファ: {missingGltfBufferUris.join(', ')}</p>
				{/if}
				{#if missingGltfImageUris.length > 0}
					<p class="mt-2">未追加画像: {missingGltfImageUris.join(', ')}</p>
				{/if}
				<p class="mt-2">補助ファイルなしのまま登録することもできます。</p>
			{:else if isWaitingForModelSupplementaryInspection}
				<p class="mt-2">モデルの参照ファイルを確認しています。</p>
			{/if}
		</div>
		<TextForm bind:value={droppedForms.name} label="データ名" error={droppedErrors.name} />
	</div>

	<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
		<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
		{#if requiresFbxManualRegistration}
			<button
				onclick={openZoneSelection}
				disabled={isDroppedRegistrationDisabled}
				class="c-btn-confirm min-w-[200px] p-4 text-lg {isDroppedRegistrationDisabled
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer'}"
			>
				座標系を選択
			</button>
		{:else if requiresModelSupplementaryResolution}
			<button
				onclick={registerDroppedModelWithoutSupplementaryFiles}
				disabled={isDroppedRegistrationDisabled}
				class="c-btn-confirm min-w-[200px] p-4 text-lg {isDroppedRegistrationDisabled
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer'}"
			>
				このまま登録
			</button>
		{/if}
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
			label="3Dモデル URL (GLTF / GLB / OBJ / 3DS / DAE / 3DM / FBX / DRC / 3MF / AMF / IFC)"
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
