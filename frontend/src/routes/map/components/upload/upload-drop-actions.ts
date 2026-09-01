import { createGlbEntry } from '$routes/map/data/entries/model';
import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { MeshFormatType } from '$routes/map/data/types/model';
import type { DialogType, UploadFiles } from '$routes/map/types';
import type maplibregl from '$routes/map/utils/maplibre';
import { showConfirmDialog } from '$routes/stores/confirmation';
import { showNotification } from '$routes/stores/notification';
import type { UploadDropDecision } from './upload-drop';

interface ApplyUploadDropDecisionContext {
	map: maplibregl.Map | null;
	setDropFile: (files: UploadFiles) => void;
	setShowDataEntry: (entry: MorivisLayerEntry | null) => void;
	setShowDialogType: (dialogType: DialogType) => void;
}

const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024;

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

const formatSize = (bytes: number): string => {
	if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / 1024).toFixed(0)} KB`;
};

const registerRemoteKmlModel = (
	map: maplibregl.Map,
	name: string,
	modelUrl: string,
	setShowDataEntry: (entry: MorivisLayerEntry | null) => void,
	setShowDialogType: (dialogType: DialogType) => void,
	setDropFile: (files: UploadFiles) => void,
	placement?: {
		lng: number;
		lat: number;
		altitude: number;
		scale?: number;
	}
) => {
	const center = map.getCenter();
	setShowDataEntry(
		createGlbEntry(
			name,
			modelUrl,
			{
				lng: placement?.lng ?? center.lng,
				lat: placement?.lat ?? center.lat,
				altitude: placement?.altitude ?? 0,
				scale: placement?.scale
			},
			getMeshFormatType(modelUrl)
		)
	);
	setShowDialogType(null);
	setDropFile(null);
};

export const checkLargeDroppedFiles = async (files: File | File[]): Promise<boolean> => {
	const fileList = Array.isArray(files) ? files : [files];
	const totalSize = fileList.reduce((sum, file) => sum + file.size, 0);
	if (totalSize < LARGE_FILE_THRESHOLD) return true;

	return showConfirmDialog({
		message: `ファイルサイズが大きいです（${
			formatSize(totalSize)
		}）。動作が不安定になる可能性があります。続行しますか？`,
		confirmText: '続行',
		cancelText: 'キャンセル'
	});
};

export const applyUploadDropDecision = (
	decision: UploadDropDecision,
	{ map, setDropFile, setShowDataEntry, setShowDialogType }: ApplyUploadDropDecisionContext
) => {
	if (decision.type === 'notification') {
		showNotification(decision.message, decision.level);
		return;
	}

	if (decision.type === 'remote-kml-model') {
		if (!map) {
			showNotification('地図の初期化前のため、KML内モデルを配置できませんでした', 'error');
			return;
		}

		registerRemoteKmlModel(
			map,
			decision.name,
			decision.modelUrl,
			setShowDataEntry,
			setShowDialogType,
			setDropFile,
			decision.placement
		);
		return;
	}

	if (decision.dropFiles !== undefined) {
		setDropFile(decision.dropFiles);
	}
	setShowDialogType(decision.dialogType);
};
