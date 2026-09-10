<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import * as yup from 'yup';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import {
		getDefaultTransformModeForIssue,
		getModelSpatialIssue
	} from '$routes/map/components/upload/transform-policy';
	import { createGlbEntry } from '$routes/map/data/entries/model';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type {
		MeshEntry,
		MeshFormatType,
		MeshStyle,
		MeshUpAxis
	} from '$routes/map/data/types/model';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { inspectGltfFile } from '$routes/map/utils/formats/gltf';
	import { inspectMtlFile, inspectObjFile } from '$routes/map/utils/formats/obj';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';
	import { inspectFbxFile } from '$routes/map/utils/three/fbx-references';
	import {
		hasIfcExactGeoreference,
		getIfcPlacementCoordinateMode,
		hasIfcGeographicCoordinates,
		readIfcPlacementMetadata,
		type IfcPlacementMetadata
	} from '$routes/map/utils/three/ifc-metadata';
	import { applyProjectedModelAxisOverride } from '$routes/map/utils/three/model-axis';
	import { computeUploadedModelMetaInWorker } from '$routes/map/utils/three/model-bounds-parallel';
	import { getModelGeoBoundsFromLocalBounds } from '$routes/map/utils/three/model-geo-bounds';
	import {
		getModelCoordinateMode,
		resolveProjectedModelPlacementFromOrigin
	} from '$routes/map/utils/three/model-georeference';
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

	const ZONE_MODEL_PREVIEW_OPACITY = 0.3;

	const getPathLikeName = (file: File) => {
		const relativePath = (file as File & { morivisRelativePath?: string }).morivisRelativePath;
		return (relativePath ?? file.name).toLowerCase();
	};

	const logIfcUpload = (event: string, details: Record<string, unknown>) => {
		if (import.meta.env.PROD) return;
		console.info(`[IFC upload] ${event}`, details);
	};

	const getModelPlacement = (file: File): ModelPlacement | undefined => {
		return (file as File & { morivisModelPlacement?: ModelPlacement }).morivisModelPlacement;
	};

	const getProjectedModelEpsg = (file: File): EpsgCode | undefined => {
		return (file as File & { morivisProjectedModelEpsg?: EpsgCode }).morivisProjectedModelEpsg;
	};

	const getMeshFormat = (pathLikeName: string): MeshFormatType => {
		if (pathLikeName.endsWith('.vrm')) return 'vrm';
		if (pathLikeName.endsWith('.gltf')) return 'gltf';
		if (pathLikeName.endsWith('.obj')) return 'obj';
		if (pathLikeName.endsWith('.3ds')) return '3ds';
		if (pathLikeName.endsWith('.dae')) return 'dae';
		if (pathLikeName.endsWith('.3dm')) return '3dm';
		if (pathLikeName.endsWith('.fbx')) return 'fbx';
		if (pathLikeName.endsWith('.drc')) return 'drc';
		if (pathLikeName.endsWith('.3mf')) return '3mf';
		if (pathLikeName.endsWith('.amf')) return 'amf';
		if (pathLikeName.endsWith('.stl')) return 'stl';
		if (pathLikeName.endsWith('.ifc')) return 'ifc';
		if (pathLikeName.endsWith('.pmx')) return 'pmx';
		if (
			pathLikeName.endsWith('.usd') ||
			pathLikeName.endsWith('.usda') ||
			pathLikeName.endsWith('.usdz')
		)
			return 'usd';
		return 'gltf';
	};

	const supportsResourceUrls = (format: MeshFormatType) => {
		return (
			format === 'gltf' ||
			format === 'vrm' ||
			format === 'obj' ||
			format === '3ds' ||
			format === 'dae' ||
			format === '3dm' ||
			format === 'fbx' ||
			format === 'pmx'
		);
	};

	// CRS を標準で保持しないが、平面直角座標で出力されることがある形式。
	const PROJECTED_COORDINATE_CANDIDATE_FORMATS = new Set<MeshFormatType>([
		'gltf',
		'obj',
		'3ds',
		'dae',
		'3dm',
		'fbx',
		'drc',
		'3mf',
		'amf',
		'stl',
		'ifc',
		'usd'
	]);

	const inputFiles = $derived.by(() => toUploadFiles(dropFile));

	const glbFile = $derived.by(() => {
		return (
			inputFiles.find((file) =>
				/\.(glb|gltf|vrm|obj|3ds|dae|3dm|fbx|drc|3mf|amf|stl|ifc|pmx|usd|usda|usdz)$/i.test(
					getPathLikeName(file)
				)
			) ?? null
		);
	});

	const activeFormat = $derived(glbFile ? getMeshFormat(getPathLikeName(glbFile)) : null);
	let stlUpAxis = $state<MeshUpAxis>('z');
	const stlUpAxisOptions = [
		{ key: 'z', name: 'Z-up（CAD・3Dプリント）' },
		{ key: 'y', name: 'Y-up（CG・3Dモデル）' }
	];
	const modelPlacement = $derived(glbFile ? getModelPlacement(glbFile) : undefined);
	const detectedProjectedModelEpsg = $derived(glbFile ? getProjectedModelEpsg(glbFile) : undefined);

	const mtlFile = $derived.by(() => {
		return inputFiles.find((file) => /\.mtl$/i.test(file.name)) ?? null;
	});

	const textureFiles = $derived.by(() => {
		return inputFiles.filter((file) =>
			/\.(png|jpe?g|bmp|tga|gif|webp|dds|spa|sph)$/i.test(file.name)
		);
	});

	const vmdFiles = $derived.by(() => {
		return inputFiles.filter((file) => /\.vmd$/i.test(getPathLikeName(file)));
	});
	const vrmaFiles = $derived.by(() => {
		return inputFiles.filter((file) => /\.vrma$/i.test(getPathLikeName(file)));
	});

	const isJsonGltfFile = $derived(
		!!glbFile && activeFormat === 'gltf' && getPathLikeName(glbFile).endsWith('.gltf')
	);

	const gltfSupplementaryFiles = $derived.by(() => {
		if (!glbFile || !isJsonGltfFile) return [];
		return inputFiles.filter((file) => file !== glbFile);
	});

	const modelSupplementaryFiles = $derived.by(() => {
		if (activeFormat === 'gltf') return gltfSupplementaryFiles;
		if (activeFormat === 'pmx') return [...textureFiles, ...vmdFiles];
		if (activeFormat === 'vrm') return vrmaFiles;
		if (activeFormat === 'usd') return [];
		return textureFiles;
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
	let analyzedProjectedCandidateFileKey = $state<string | null>(null);
	let projectedCandidateSourceBbox = $state<[number, number, number, number] | null>(null);
	let isInspectingProjectedCandidateCoordinates = $state(false);
	let autoOpenedZoneFileKey = $state<string | null>(null);
	let objInspectionFileKey = $state<string | null>(null);
	let isInspectingObjReferences = $state(false);
	let referencedObjMaterialLibraries = $state<string[]>([]);
	let mtlInspectionFileKey = $state<string | null>(null);
	let isInspectingMtlReferences = $state(false);
	let referencedMtlTexturePaths = $state<string[]>([]);
	let fbxInspectionFileKey = $state<string | null>(null);
	let isInspectingFbxReferences = $state(false);
	let referencedFbxTexturePaths = $state<string[]>([]);
	let fbxDescription = $state<string | undefined>(undefined);
	let gltfInspectionFileKey = $state<string | null>(null);
	let isInspectingGltfReferences = $state(false);
	let referencedGltfBufferUris = $state<string[]>([]);
	let referencedGltfImageUris = $state<string[]>([]);
	let ifcInspectionFileKey = $state<string | null>(null);
	let isInspectingIfcPlacement = $state(false);
	let ifcPlacementMetadata = $state<IfcPlacementMetadata | undefined>(undefined);
	let analyzedIfcFileKey = $state<string | null>(null);
	let ifcSourceBbox = $state<[number, number, number, number] | null>(null);
	let isPreparingIfcZoneSelection = $state(false);
	let zoneModelPreviewEntry: MeshEntry<MeshStyle> | null = null;
	let zoneModelPreviewBuildPromise: Promise<MeshEntry<MeshStyle> | null> | null = null;
	let zoneModelPreviewSourceKey: string | null = null;
	let zoneModelPreviewSyncId = 0;
	let zoneModelPreviewFinalizing = false;

	const requiresProjectedCandidateCoordinateInspection = $derived(
		!!activeFormat &&
			activeFormat !== 'ifc' &&
			PROJECTED_COORDINATE_CANDIDATE_FORMATS.has(activeFormat) &&
			!modelPlacement &&
			!detectedProjectedModelEpsg
	);
	const modelSpatialIssue = $derived.by(() => {
		if (!activeFormat) return null;

		return getModelSpatialIssue({
			hasEmbeddedEpsg:
				!!detectedProjectedModelEpsg ||
				(activeFormat === 'ifc' && hasIfcExactGeoreference(ifcPlacementMetadata)),
			hasExplicitPlacement: !!modelPlacement,
			coordinateMode:
				activeFormat === 'ifc'
					? getIfcPlacementCoordinateMode(ifcPlacementMetadata)
					: getModelCoordinateMode(projectedCandidateSourceBbox)
		});
	});
	const requiresProjectedCandidateZoneSelection = $derived(
		requiresProjectedCandidateCoordinateInspection && modelSpatialIssue === 'crs-missing'
	);
	const requiresIfcZoneSelection = $derived(
		activeFormat === 'ifc' && !isInspectingIfcPlacement && modelSpatialIssue === 'crs-missing'
	);
	const requiresModelPlacement = $derived(modelSpatialIssue === 'placement-missing');
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
	const missingFbxTexturePaths = $derived.by(() => {
		if (activeFormat !== 'fbx' || referencedFbxTexturePaths.length === 0) return [];
		return referencedFbxTexturePaths.filter(
			(pathLikeValue) => !hasMatchingResourceFile(textureResourceKeys, pathLikeValue)
		);
	});
	const requiresFbxTextureResolution = $derived(
		activeFormat === 'fbx' && missingFbxTexturePaths.length > 0
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
			(!!glbFile && activeFormat === 'fbx' && isInspectingFbxReferences) ||
			(!!glbFile && isJsonGltfFile && isInspectingGltfReferences) ||
			isInspectingProjectedCandidateCoordinates ||
			(!!glbFile && activeFormat === 'ifc' && isInspectingIfcPlacement)
	);
	const requiresModelSupplementaryResolution = $derived(
		requiresObjSupplementaryResolution ||
			requiresFbxTextureResolution ||
			requiresGltfSupplementaryResolution
	);
	const requiresStlAxisSelection = $derived(activeFormat === 'stl');
	const requiresManualRegistration = $derived(
		requiresProjectedCandidateZoneSelection ||
			requiresIfcZoneSelection ||
			requiresModelSupplementaryResolution ||
			requiresStlAxisSelection
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
		if (!glbFile || activeFormat !== 'fbx') {
			fbxInspectionFileKey = null;
			isInspectingFbxReferences = false;
			referencedFbxTexturePaths = [];
			fbxDescription = undefined;
			return;
		}

		const nextFileKey = getPathLikeName(glbFile);
		if (fbxInspectionFileKey === nextFileKey) return;

		fbxInspectionFileKey = nextFileKey;
		isInspectingFbxReferences = true;
		referencedFbxTexturePaths = [];
		fbxDescription = undefined;

		const inspectReferences = async () => {
			const inspectionKey = nextFileKey;
			try {
				const inspection = await inspectFbxFile(glbFile);
				if (fbxInspectionFileKey !== inspectionKey) return;
				referencedFbxTexturePaths = inspection.referencedTexturePaths;
				fbxDescription = inspection.description;
			} catch (error) {
				if (fbxInspectionFileKey !== inspectionKey) return;
				referencedFbxTexturePaths = [];
				fbxDescription = undefined;
				console.warn('FBX の参照画像判定に失敗しました', error);
			} finally {
				if (fbxInspectionFileKey === inspectionKey) {
					isInspectingFbxReferences = false;
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
		if (!glbFile || activeFormat !== 'ifc') {
			ifcInspectionFileKey = null;
			isInspectingIfcPlacement = false;
			ifcPlacementMetadata = undefined;
			return;
		}

		const nextFileKey = getPathLikeName(glbFile);
		if (ifcInspectionFileKey === nextFileKey) return;

		ifcInspectionFileKey = nextFileKey;
		isInspectingIfcPlacement = true;
		ifcPlacementMetadata = undefined;
		logIfcUpload('inspection-start', {
			fileName: glbFile.name,
			fileKey: nextFileKey,
			fileSize: glbFile.size
		});

		const inspectPlacement = async () => {
			const inspectionKey = nextFileKey;
			try {
				const metadata = await readIfcPlacementMetadata(glbFile);
				if (ifcInspectionFileKey !== inspectionKey) return;
				ifcPlacementMetadata = metadata;
				logIfcUpload('inspection-complete', {
					fileName: glbFile.name,
					fileKey: inspectionKey,
					metadata,
					hasGeographicCoordinates: hasIfcGeographicCoordinates(metadata),
					hasExactGeoreference: hasIfcExactGeoreference(metadata),
					coordinateMode: getIfcPlacementCoordinateMode(metadata)
				});
			} catch (error) {
				if (ifcInspectionFileKey !== inspectionKey) return;
				ifcPlacementMetadata = undefined;
				logIfcUpload('inspection-failed', {
					fileName: glbFile.name,
					fileKey: inspectionKey,
					error
				});
				console.warn('IFC の地理座標判定に失敗しました', error);
			} finally {
				if (ifcInspectionFileKey === inspectionKey) {
					isInspectingIfcPlacement = false;
				}
			}
		};

		void inspectPlacement();
	});

	$effect(() => {
		if (!glbFile || activeFormat !== 'ifc') return;
		logIfcUpload('spatial-decision', {
			fileName: glbFile.name,
			fileKey: getPathLikeName(glbFile),
			isInspectingIfcPlacement,
			metadata: ifcPlacementMetadata,
			modelSpatialIssue,
			requiresIfcZoneSelection,
			requiresModelPlacement,
			isWaitingForModelSupplementaryInspection,
			transformOptionMode
		});
	});

	$effect(() => {
		if (!glbFile || !requiresIfcZoneSelection || activeFormat !== 'ifc') {
			analyzedIfcFileKey = null;
			ifcSourceBbox = null;
			isPreparingIfcZoneSelection = false;
			return;
		}

		const nextFileKey = getPathLikeName(glbFile);
		if (analyzedIfcFileKey === nextFileKey) return;

		analyzedIfcFileKey = nextFileKey;
		ifcSourceBbox = null;
		isPreparingIfcZoneSelection = true;

		const analyzeSourceBbox = async () => {
			const center = mapStore.getCenter();
			const entry = createGlbEntry(
				glbFile.name.replace(/\.[^.]+$/, ''),
				'',
				{
					lng: center?.lng ?? 0,
					lat: center?.lat ?? 0,
					altitude: 0
				},
				'ifc'
			);

			try {
				isProcessing.set(true);
				const uploadedModelMeta = await computeUploadedModelMetaInWorker({
					file: glbFile,
					format: 'ifc',
					style: entry.style,
					normalizeToLocalOrigin: false
				});
				ifcSourceBbox = uploadedModelMeta.sourceBbox ?? null;
				if (!uploadedModelMeta.sourceBbox) {
					showNotification('IFCの範囲を取得できませんでした', 'error');
				}
			} catch (error) {
				ifcSourceBbox = null;
				console.warn('IFCの範囲解析に失敗しました', error);
				showNotification('IFCの範囲解析に失敗しました', 'error');
			} finally {
				isPreparingIfcZoneSelection = false;
				isProcessing.set(false);
			}
		};

		void analyzeSourceBbox();
	});

	$effect(() => {
		if (!glbFile || !activeFormat || !requiresProjectedCandidateCoordinateInspection) {
			analyzedProjectedCandidateFileKey = null;
			projectedCandidateSourceBbox = null;
			isInspectingProjectedCandidateCoordinates = false;
			autoOpenedZoneFileKey = null;
			return;
		}

		const resourceFiles = modelSupplementaryFiles;
		const nextFileKey = [
			getPathLikeName(glbFile),
			...resourceFiles.map(getPathLikeName),
			...(activeFormat === 'stl' ? [stlUpAxis] : [])
		].join('::');
		if (analyzedProjectedCandidateFileKey === nextFileKey) return;

		analyzedProjectedCandidateFileKey = nextFileKey;
		projectedCandidateSourceBbox = null;
		isInspectingProjectedCandidateCoordinates = true;

		const inspectCoordinates = async () => {
			const inspectionKey = nextFileKey;
			const center = mapStore.getCenter();
			const resourceUrls = resourceFiles.length > 0 ? buildResourceUrls(resourceFiles) : undefined;
			const entry = createGlbEntry(
				glbFile.name.replace(/\.[^.]+$/, ''),
				'',
				{ lng: center?.lng ?? 0, lat: center?.lat ?? 0, altitude: 0 },
				activeFormat,
				undefined,
				resourceUrls,
				activeFormat === 'stl' ? { upAxis: stlUpAxis } : undefined
			);

			try {
				isProcessing.set(true);
				const uploadedModelMeta = await computeUploadedModelMetaInWorker({
					file: glbFile,
					format: activeFormat,
					style: entry.style,
					resourceUrls,
					normalizeToLocalOrigin: false,
					upAxis: activeFormat === 'stl' ? stlUpAxis : undefined
				});
				if (analyzedProjectedCandidateFileKey !== inspectionKey) return;
				projectedCandidateSourceBbox = uploadedModelMeta.sourceBbox ?? null;
			} catch (error) {
				if (analyzedProjectedCandidateFileKey !== inspectionKey) return;
				projectedCandidateSourceBbox = null;
				console.warn(`${activeFormat} の座標範囲解析に失敗しました`, error);
			} finally {
				if (analyzedProjectedCandidateFileKey === inspectionKey) {
					isInspectingProjectedCandidateCoordinates = false;
					isProcessing.set(false);
				} else if (!analyzedProjectedCandidateFileKey) {
					isProcessing.set(false);
				}
			}
		};

		void inspectCoordinates();
	});

	$effect(() => {
		if (
			!glbFile ||
			(!requiresProjectedCandidateZoneSelection && !requiresIfcZoneSelection) ||
			(activeFormat !== 'ifc' &&
				!PROJECTED_COORDINATE_CANDIDATE_FORMATS.has(activeFormat ?? 'gltf'))
		)
			return;
		if (activeFormat === 'ifc' && (isPreparingIfcZoneSelection || !ifcSourceBbox)) return;
		if (activeFormat !== 'ifc' && !projectedCandidateSourceBbox) return;
		if (activeFormat === 'stl') return;

		const fileKey = getPathLikeName(glbFile);
		if (autoOpenedZoneFileKey === fileKey) return;

		autoOpenedZoneFileKey = fileKey;
		if (activeFormat === 'ifc') {
			logIfcUpload('open-zone-selection', {
				fileName: glbFile.name,
				fileKey,
				metadata: ifcPlacementMetadata,
				sourceBbox: ifcSourceBbox
			});
		}
		focusBbox = null;
		transformOptionMode = 'zone';
		showNotification(
			activeFormat === 'ifc'
				? 'IFC に地理座標がないため、座標系を選択してください'
				: `${activeFormat?.toUpperCase()} は平面直角座標として扱います。座標系を選択してください`,
			'info'
		);
	});

	const isDroppedRegistrationDisabled = $derived.by(() => {
		if (!droppedForms.name.trim()) return true;
		if (requiresProjectedCandidateZoneSelection) {
			return isInspectingProjectedCandidateCoordinates || !projectedCandidateSourceBbox;
		}
		if (requiresIfcZoneSelection) {
			return isPreparingIfcZoneSelection || !ifcSourceBbox;
		}
		if (requiresModelSupplementaryResolution) {
			return (
				isInspectingObjReferences ||
				isInspectingMtlReferences ||
				isInspectingFbxReferences ||
				isInspectingGltfReferences
			);
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
		const resourceFiles = modelSupplementaryFiles;
		const isLocalFbx =
			activeFormat === 'fbx' && getModelCoordinateMode(projectedCandidateSourceBbox) === 'local';

		if (resourceFiles.length > 0) {
			resourceUrls = buildResourceUrls(resourceFiles);
		}
		if (activeFormat === 'obj' && mtlFile) {
			resolvedMtlUrl = URL.createObjectURL(mtlFile);
		}

		const normalizeToLocalOrigin =
			(activeFormat === 'ifc' ||
				activeFormat === 'gltf' ||
				activeFormat === 'vrm' ||
				activeFormat === 'pmx' ||
				activeFormat === 'stl' ||
				activeFormat === 'usd' ||
				(activeFormat === 'fbx' && !isLocalFbx)) &&
			!resolvedProjectedModelEpsg;
		const entry = createGlbEntry(
			name,
			blobUrl,
			{
				lng: modelPlacement?.lng ?? center?.lng ?? 0,
				lat: modelPlacement?.lat ?? center?.lat ?? 0,
				altitude: modelPlacement?.altitude ?? 0,
				baseScale: modelPlacement?.scale
			},
			activeFormat,
			resolvedMtlUrl,
			supportsResourceUrls(activeFormat) ? resourceUrls : undefined,
			{
				...(normalizeToLocalOrigin ? { normalizeToLocalOrigin: true } : {}),
				...(isLocalFbx ? { preserveSourceOrientation: true } : {}),
				...(activeFormat === 'stl' ? { upAxis: stlUpAxis } : {}),
				sourceFileName: glbFile.name,
				initialShadingEnabled: activeFormat !== 'vrm' && activeFormat !== 'pmx'
			}
		);
		if (activeFormat === 'fbx' && fbxDescription) {
			entry.metaData.description = fbxDescription;
		}
		if (activeFormat === 'pmx' && resourceUrls && vmdFiles.length > 0) {
			const clips = vmdFiles.flatMap((file) => {
				const url = resourceUrls?.[file.name.toLowerCase()];
				if (!url) return [];
				return [
					{
						name: file.name.replace(/\.vmd$/i, ''),
						type: 'vmd' as const,
						url
					}
				];
			});
			if (clips.length > 0) {
				entry.properties = {
					...entry.properties,
					animation: {
						clips,
						defaultClipIndex: 0,
						autoPlay: true,
						defaultLoop: true
					}
				};
				entry.state = {
					...entry.state,
					animation: {
						currentClipIndex: 0,
						playing: true,
						speed: 1,
						loop: true
					}
				};
			}
		}
		if (activeFormat === 'vrm' && resourceUrls && vrmaFiles.length > 0) {
			const clips = vrmaFiles.flatMap((file) => {
				const url = resourceUrls?.[file.name.toLowerCase()];
				if (!url) return [];
				return [
					{
						name: file.name.replace(/\.vrma$/i, ''),
						type: 'vrma' as const,
						url
					}
				];
			});
			if (clips.length > 0) {
				entry.properties = {
					...entry.properties,
					animation: {
						clips,
						defaultClipIndex: 0,
						autoPlay: true,
						defaultLoop: true
					}
				};
				entry.state = {
					...entry.state,
					animation: {
						currentClipIndex: 0,
						playing: true,
						speed: 1,
						loop: true
					}
				};
			}
		}
		if (activeFormat === 'ifc' && ifcPlacementMetadata?.description) {
			entry.metaData.description = ifcPlacementMetadata.description;
		}
		applyProjectedModelAxisOverride(
			entry.style.transform,
			activeFormat,
			resolvedProjectedModelEpsg
		);

		try {
			isProcessing.set(true);
			const uploadedModelMeta = await computeUploadedModelMetaInWorker({
				file: glbFile,
				format: activeFormat,
				style: entry.style,
				resourceUrls,
				normalizeToLocalOrigin: entry.format.normalizeToLocalOrigin,
				upAxis: entry.format.upAxis,
				projectedModelEpsg: resolvedProjectedModelEpsg
			});

			if (uploadedModelMeta.resolvedPlacement) {
				entry.style.transform.lng = uploadedModelMeta.resolvedPlacement.lng;
				entry.style.transform.lat = uploadedModelMeta.resolvedPlacement.lat;
				entry.style.transform.altitude = uploadedModelMeta.resolvedPlacement.altitude;
				entry.metaData.altitude = uploadedModelMeta.resolvedPlacement.altitude;
				entry.format.georeference = uploadedModelMeta.resolvedPlacement.georeference;
			}

			if (uploadedModelMeta.animationNames.length > 0) {
				const configuredAnimation = entry.properties?.animation;
				entry.properties = {
					...entry.properties,
					animation: {
						...configuredAnimation,
						clips: [
							...(configuredAnimation?.clips ?? []),
							...uploadedModelMeta.animationNames.map((clipName) => ({ name: clipName }))
						],
						defaultLoop: configuredAnimation?.defaultLoop ?? true
					}
				};
				if (!entry.state?.animation) {
					entry.state = {
						...entry.state,
						animation: {
							currentClipIndex: 0,
							playing: false,
							speed: 1,
							loop: true
						}
					};
				}
			}
			if (uploadedModelMeta.scaleMultiplier !== 1) {
				entry.style.transform.baseScale =
					(entry.style.transform.baseScale ?? 1) * uploadedModelMeta.scaleMultiplier;
				showNotification('小さいモデルのため拡大して表示します', 'info');
			}
			entry.metaData.bounds = uploadedModelMeta.bounds;
			entry.metaData.xyzImageTile = uploadedModelMeta.xyzImageTile;
			entry.format.localBounds = uploadedModelMeta.localBounds;

			if (!import.meta.env.PROD) {
				console.info('[model-entry] created', {
					fileName: glbFile.name,
					format: activeFormat,
					epsg: resolvedProjectedModelEpsg,
					sourceBbox: uploadedModelMeta.sourceBbox,
					bounds: entry.metaData.bounds,
					transform: entry.style.transform,
					georeference: entry.format.georeference
				});
			}
		} catch (error) {
			console.warn('3Dモデルの範囲を取得できませんでした', error);
		} finally {
			isProcessing.set(false);
		}

		return entry;
	};

	const createProjectedModelEntryForEpsg = async (
		entry: MeshEntry<MeshStyle>,
		epsg: EpsgCode,
		opacity: MeshStyle['opacity']
	): Promise<MeshEntry<MeshStyle>> => {
		const georeference = entry.format.georeference;
		if (!georeference) {
			throw new Error('3Dモデルの投影原点を取得できませんでした');
		}

		const placement = await resolveProjectedModelPlacementFromOrigin(
			georeference.projectedOrigin,
			epsg,
			georeference.unitScaleMeters,
			georeference.coordinateSpace
		);
		const style: MeshStyle = {
			...entry.style,
			opacity,
			transform: {
				...entry.style.transform,
				lng: placement.lng,
				lat: placement.lat,
				altitude: placement.altitude
			}
		};
		const bounds = entry.format.localBounds
			? getModelGeoBoundsFromLocalBounds(entry.format.localBounds, style)
			: entry.metaData.bounds;

		return {
			...entry,
			format: {
				...entry.format,
				georeference: placement.georeference
			},
			metaData: {
				...entry.metaData,
				altitude: placement.altitude,
				bounds,
				xyzImageTile: findCenterTile(bounds)
			},
			style
		};
	};

	const getZoneModelPreviewEntry = async (epsg: EpsgCode) => {
		if (zoneModelPreviewEntry) return zoneModelPreviewEntry;
		zoneModelPreviewBuildPromise ??= buildDroppedEntry({
			name: droppedForms.name,
			projectedModelEpsg: epsg
		});
		const pendingBuild = zoneModelPreviewBuildPromise;
		const entry = await pendingBuild;
		if (zoneModelPreviewBuildPromise !== pendingBuild) return null;
		if (entry) zoneModelPreviewEntry = entry;
		return entry;
	};

	const syncZoneModelPreview = async (epsg: EpsgCode, syncId: number) => {
		try {
			const entry = await getZoneModelPreviewEntry(epsg);
			if (!entry) return;
			const previewEntry = await createProjectedModelEntryForEpsg(
				entry,
				epsg,
				ZONE_MODEL_PREVIEW_OPACITY
			);
			if (syncId !== zoneModelPreviewSyncId || transformOptionMode !== 'zone' || !glbFile) return;

			showDataEntry = previewEntry;
			// 座標系候補の計算が終わった時点で操作を戻す。
			// Three.js 側のモデル読込は画面を塞がず、完了次第プレビューへ反映する。
			isProcessing.set(false);
			await mapStore.setThreeLayer([previewEntry], 'preview');
		} catch (error) {
			if (syncId !== zoneModelPreviewSyncId) return;
			console.error('座標系選択用3Dモデルの表示に失敗しました', error);
			showNotification('3Dモデルの候補位置を表示できませんでした', 'error');
		} finally {
			if (syncId === zoneModelPreviewSyncId) isProcessing.set(false);
		}
	};

	const clearZoneModelPreview = () => {
		const entryId = zoneModelPreviewEntry?.id;
		zoneModelPreviewSyncId += 1;
		zoneModelPreviewEntry = null;
		zoneModelPreviewBuildPromise = null;
		zoneModelPreviewSourceKey = null;
		if (entryId && showDataEntry?.id === entryId) showDataEntry = null;
		void mapStore.setThreeLayer([], 'preview');
	};

	$effect(() => {
		const isActive =
			transformOptionMode === 'zone' &&
			!!glbFile &&
			(requiresProjectedCandidateZoneSelection || requiresIfcZoneSelection);
		if (!isActive) {
			if (
				!zoneConfirmedEpsg &&
				!zoneModelPreviewFinalizing &&
				(zoneModelPreviewEntry || zoneModelPreviewBuildPromise)
			) {
				untrack(clearZoneModelPreview);
			}
			return;
		}

		const sourceKey = getPathLikeName(glbFile);
		if (zoneModelPreviewSourceKey && zoneModelPreviewSourceKey !== sourceKey) {
			untrack(clearZoneModelPreview);
		}
		zoneModelPreviewSourceKey = sourceKey;
		const syncId = ++zoneModelPreviewSyncId;
		void syncZoneModelPreview(selectedEpsgCode, syncId);
	});

	onDestroy(() => {
		if (zoneModelPreviewEntry || zoneModelPreviewBuildPromise) clearZoneModelPreview();
	});

	$effect(() => {
		if (activeFormat === 'ifc') {
			logIfcUpload('registration-gate', {
				fileName: glbFile?.name,
				fileKey: glbFile ? getPathLikeName(glbFile) : null,
				requiresManualRegistration,
				isWaitingForModelSupplementaryInspection,
				isInspectingIfcPlacement,
				requiresIfcZoneSelection,
				requiresModelPlacement,
				transformOptionMode
			});
		}
		if (!glbFile || requiresManualRegistration || isWaitingForModelSupplementaryInspection) return;
		if (activeFormat === 'obj' && (isInspectingObjReferences || isInspectingMtlReferences)) return;
		if (activeFormat === 'fbx' && isInspectingFbxReferences) return;
		if (activeFormat === 'gltf' && isInspectingGltfReferences) return;

		const register = async () => {
			if (activeFormat === 'ifc') {
				logIfcUpload('auto-registration-start', {
					fileName: glbFile.name,
					fileKey: getPathLikeName(glbFile),
					metadata: ifcPlacementMetadata,
					modelSpatialIssue,
					requiresModelPlacement
				});
			}
			const entry = await buildDroppedEntry();
			if (!entry) return;

			showDataEntry = entry;
			if (requiresModelPlacement) {
				const transformMode = getDefaultTransformModeForIssue('model', 'placement-missing');
				if (activeFormat === 'ifc') {
					logIfcUpload('open-model-placement', {
						fileName: glbFile.name,
						fileKey: getPathLikeName(glbFile),
						entryId: entry.id,
						transformMode
					});
				}
				transformOptionMode = transformMode;
				return;
			}
			if (activeFormat === 'ifc') {
				logIfcUpload('skip-model-placement', {
					fileName: glbFile.name,
					fileKey: getPathLikeName(glbFile),
					entryId: entry.id,
					metadata: ifcPlacementMetadata
				});
			}
			showDialogType = null;
			dropFile = null;
		};

		register();
	});

	const registerDroppedProjectedModel = async (projectedModelEpsg: EpsgCode) => {
		if (!validateDroppedForms()) {
			zoneModelPreviewFinalizing = false;
			transformOptionMode = null;
			return;
		}

		try {
			isProcessing.set(true);
			const entry = zoneModelPreviewEntry
				? await createProjectedModelEntryForEpsg(
						zoneModelPreviewEntry,
						projectedModelEpsg,
						zoneModelPreviewEntry.style.opacity
					)
				: await buildDroppedEntry({
						name: droppedForms.name,
						projectedModelEpsg
					});
			if (!entry) return;

			zoneModelPreviewEntry = null;
			zoneModelPreviewBuildPromise = null;
			zoneModelPreviewSourceKey = null;
			showDataEntry = entry;
			transformOptionMode = null;
			focusBbox = null;
			showDialogType = null;
			dropFile = null;
		} catch (error) {
			console.error('3Dモデルの座標系確定に失敗しました', error);
			showNotification('3Dモデルの座標系を確定できませんでした', 'error');
			clearZoneModelPreview();
			transformOptionMode = null;
		} finally {
			zoneModelPreviewFinalizing = false;
			isProcessing.set(false);
		}
	};

	const openZoneSelection = () => {
		if (!validateDroppedForms()) return;
		if (requiresProjectedCandidateZoneSelection && !projectedCandidateSourceBbox) {
			showNotification('3Dモデルの範囲を取得できませんでした', 'error');
			return;
		}
		if (requiresIfcZoneSelection && !ifcSourceBbox) {
			showNotification('IFCの範囲を取得できませんでした', 'error');
			return;
		}

		focusBbox = projectedCandidateSourceBbox ?? ifcSourceBbox;
		transformOptionMode = 'zone';
	};

	$effect(() => {
		if (!glbFile || !requiresProjectedCandidateZoneSelection || !projectedCandidateSourceBbox)
			return;
		if (isSameBbox(focusBbox, projectedCandidateSourceBbox)) return;

		focusBbox = projectedCandidateSourceBbox;
	});

	$effect(() => {
		if (!glbFile || !requiresIfcZoneSelection || !ifcSourceBbox) return;
		if (isSameBbox(focusBbox, ifcSourceBbox)) return;

		focusBbox = ifcSourceBbox;
	});

	$effect(() => {
		if (
			!zoneConfirmedEpsg ||
			showDialogType !== 'model' ||
			(!requiresProjectedCandidateZoneSelection && !requiresIfcZoneSelection)
		)
			return;

		const epsg = zoneConfirmedEpsg;
		untrack(() => {
			zoneModelPreviewFinalizing = true;
			zoneConfirmedEpsg = null;
			void registerDroppedProjectedModel(epsg);
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
		const normalizeToLocalOrigin =
			format === 'ifc' ||
			format === 'fbx' ||
			format === 'pmx' ||
			format === 'vrm' ||
			format === 'stl' ||
			format === 'usd';
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
			{
				...(normalizeToLocalOrigin ? { normalizeToLocalOrigin: true } : {}),
				...(format === 'stl' ? { upAxis: stlUpAxis } : {})
			}
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
		if (requiresStlAxisSelection && requiresModelPlacement) {
			transformOptionMode = getDefaultTransformModeForIssue('model', 'placement-missing');
			return;
		}
		showDialogType = null;
		dropFile = null;
	};
</script>

{#if shouldShowDroppedModelPanel && glbFile}
	<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
		<span class="text-2xl font-bold"
			>{activeFormat === 'fbx'
				? 'FBXファイルの登録'
				: activeFormat === 'ifc'
					? 'IFCファイルの登録'
					: `${activeFormat?.toUpperCase() ?? '3Dモデル'}ファイルの登録`}</span
		>
	</div>

	<div
		class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
	>
		<div class="w-full rounded-md bg-black/15 p-3 text-sm text-gray-200">
			<p>{glbFile.name}</p>
			{#if requiresProjectedCandidateZoneSelection}
				<p class="mt-2">
					{activeFormat?.toUpperCase()} は平面直角座標らしい座標値を持ちます。ZoneMenu で投影座標系を選択して配置します。
				</p>
				<p class="mt-2">現在の選択: EPSG:{selectedEpsgCode}</p>
				{#if isInspectingProjectedCandidateCoordinates}
					<p class="mt-2">モデルの座標範囲を解析しています。</p>
				{:else if projectedCandidateSourceBbox}
					{@const sourceBbox = projectedCandidateSourceBbox}
					<p class="mt-2">
						範囲: X {sourceBbox?.[0].toFixed(3)} - {sourceBbox?.[2].toFixed(3)}, Y {sourceBbox?.[1].toFixed(
							3
						)} - {sourceBbox?.[3].toFixed(3)}
					</p>
				{/if}
			{:else if isInspectingProjectedCandidateCoordinates}
				<p class="mt-2">モデルの座標範囲を解析しています。</p>
			{:else if requiresIfcZoneSelection}
				<p class="mt-2">
					IFC に地理座標が含まれていません。入力座標の投影座標系を選択して配置します。
				</p>
				<p class="mt-2">現在の選択: EPSG:{selectedEpsgCode}</p>
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
			{:else if requiresFbxTextureResolution}
				<p class="mt-2">
					この FBX はテクスチャ画像を参照しています。画像を追加ドロップするとそのまま続行できます。
				</p>
				<p class="mt-2">未追加画像: {missingFbxTexturePaths.join(', ')}</p>
				<p class="mt-2">画像なしのまま登録することもできます。</p>
			{:else if activeFormat === 'pmx' && vmdFiles.length > 0}
				<p class="mt-2">
					VMDモーションを{vmdFiles.length}件追加します。先頭のモーションを既定で再生します。
				</p>
			{:else if activeFormat === 'vrm' && vrmaFiles.length > 0}
				<p class="mt-2">
					VRMAモーションを{vrmaFiles.length}件追加します。先頭のモーションを既定で再生します。
				</p>
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
		{#if activeFormat === 'stl'}
			<div class="w-full p-2">
				<HorizontalSelectBox
					label="モデルの上方向"
					bind:group={stlUpAxis}
					options={stlUpAxisOptions}
				/>
				<p class="mt-2 px-1 text-xs text-gray-400">
					STLには上方向の情報がないため、書き出し元に合わせて選択してください。
				</p>
			</div>
		{/if}
	</div>

	<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
		<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
		{#if requiresProjectedCandidateZoneSelection || requiresIfcZoneSelection}
			<button
				onclick={openZoneSelection}
				disabled={isDroppedRegistrationDisabled}
				class="c-btn-confirm min-w-[200px] p-4 text-lg {isDroppedRegistrationDisabled
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer'}"
			>
				座標系を選択
			</button>
		{:else if requiresModelSupplementaryResolution || requiresStlAxisSelection}
			<button
				onclick={registerDroppedModelWithoutSupplementaryFiles}
				disabled={isDroppedRegistrationDisabled}
				class="c-btn-confirm min-w-[200px] p-4 text-lg {isDroppedRegistrationDisabled
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer'}"
			>
				{requiresStlAxisSelection ? 'この向きで登録' : 'このまま登録'}
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
			label="3Dモデル URL (GLTF / GLB / USD / USDZ / VRM / OBJ / 3DS / DAE / 3DM / FBX / DRC / 3MF / AMF / STL / IFC / PMX)"
			error={errors.url}
		/>
		{#if forms.url.trim().toLowerCase().endsWith('.stl')}
			<div class="w-full p-2">
				<HorizontalSelectBox
					label="モデルの上方向"
					bind:group={stlUpAxis}
					options={stlUpAxisOptions}
				/>
				<p class="mt-2 px-1 text-xs text-gray-400">
					STLには上方向の情報がないため、書き出し元に合わせて選択してください。
				</p>
			</div>
		{/if}
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
