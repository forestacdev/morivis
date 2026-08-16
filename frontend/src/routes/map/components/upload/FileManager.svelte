<script lang="ts">
	import JSZip from 'jszip';

	import { resolveDroppedFiles } from './upload-drop';
	import { getPathLikeName } from './upload-drop-matchers';

	import { createGlbEntry } from '$routes/map/data/entries/model';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { MeshFormatType } from '$routes/map/data/types/model';
	import type { DialogType, UploadFiles } from '$routes/map/types';
	import maplibregl from '$routes/map/utils/maplibre';
	import { showConfirmDialog } from '$routes/stores/confirmation';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		map: maplibregl.Map;
		isDragover: boolean;
		dropFile: UploadFiles;
		tempLayerEntries: MorivisLayerEntry[];
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		focusBbox: [number, number, number, number] | null;
	}

	let {
		map,
		isDragover = $bindable(),
		dropFile = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		focusBbox = $bindable()
	}: Props = $props();

	const getMeshFormatType = (path: string): MeshFormatType => {
		const normalizedPath = path.toLowerCase();
		if (normalizedPath.endsWith('.obj')) return 'obj';
		if (normalizedPath.endsWith('.3ds')) return '3ds';
		if (normalizedPath.endsWith('.dae')) return 'dae';
		if (normalizedPath.endsWith('.3dm')) return '3dm';
		if (normalizedPath.endsWith('.fbx')) return 'fbx';
		if (normalizedPath.endsWith('.drc')) return 'drc';
		if (normalizedPath.endsWith('.3mf')) return '3mf';
		if (normalizedPath.endsWith('.amf')) return 'amf';
		if (normalizedPath.endsWith('.ifc')) return 'ifc';
		return 'gltf';
	};
	const registerRemoteKmlModel = (
		name: string,
		modelUrl: string,
		placement?: {
			lng: number;
			lat: number;
			altitude: number;
			scale?: number;
		}
	) => {
		const center = map.getCenter();
		showDataEntry = createGlbEntry(
			name,
			modelUrl,
			{
				lng: placement?.lng ?? center.lng,
				lat: placement?.lat ?? center.lat,
				altitude: placement?.altitude ?? 0,
				scale: placement?.scale
			},
			getMeshFormatType(modelUrl)
		);
		showDialogType = null;
		dropFile = null;
	};
	const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB

	/** ファイルサイズをフォーマット */
	const formatSize = (bytes: number): string => {
		if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
		if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / 1024).toFixed(0)} KB`;
	};

	/** 大きなファイルの場合に確認ダイアログを表示。キャンセルならfalseを返す */
	const checkLargeFile = async (files: File | File[]): Promise<boolean> => {
		const fileList = Array.isArray(files) ? files : [files];
		const totalSize = fileList.reduce((sum, f) => sum + f.size, 0);
		if (totalSize < LARGE_FILE_THRESHOLD) return true;

		return showConfirmDialog({
			message: `ファイルサイズが大きいです（${formatSize(totalSize)}）。動作が不安定になる可能性があります。続行しますか？`,
			confirmText: '続行',
			cancelText: 'キャンセル'
		});
	};

	const applyDropDecision = (decision: Awaited<ReturnType<typeof resolveDroppedFiles>>) => {
		if (decision.type === 'notification') {
			showNotification(decision.message, decision.level);
			return;
		}

		if (decision.type === 'remote-kml-model') {
			registerRemoteKmlModel(decision.name, decision.modelUrl, decision.placement);
			return;
		}

		if (decision.dropFiles !== undefined) {
			dropFile = decision.dropFiles;
		}
		showDialogType = decision.dialogType;
	};

	const setFile = async (file: File | File[]) => {
		// 大きなファイルの確認
		if (!(await checkLargeFile(file))) return;

		const decision = await resolveDroppedFiles(file);
		applyDropDecision(decision);
	};

	$effect(() => {
		if (dropFile) {
			setFile(dropFile);
		}
	});
</script>

<style>
</style>
