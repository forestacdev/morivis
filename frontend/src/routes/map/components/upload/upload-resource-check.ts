import { formatMca } from '$routes/map/utils/formats/mca/definition';
import { isMvtFile, parseMvtPath } from '$routes/map/utils/formats/mvt';
import { isLocalRasterTileFolder } from '$routes/map/utils/formats/raster-tiles';
import { formatRaster } from '$routes/map/utils/formats/raster/definition';
import { DEFAULT_UPLOAD_WARNING_BYTES } from '$routes/map/utils/formats/resource-limits';
import { findLocalTilesetFiles } from '$routes/map/utils/formats/tiles3d';
import { format3dtiles } from '$routes/map/utils/formats/tiles3d/definition';
import { formatVector } from '$routes/map/utils/formats/vector/definition';
import { showConfirmDialog } from '$routes/stores/confirmation';

// 同じファイル一式の確認を入口と解析直前で繰り返さない。追加・差し替え後は再確認する。
const confirmedGroups = new WeakMap<File, ReadonlySet<File>>();

const formatSize = (bytes: number): string => {
	if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
	if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
	return `${(bytes / 1024).toFixed(0)} KiB`;
};

export const checkLargeDroppedFiles = async (files: File | File[]): Promise<boolean> => {
	const fileList = [...new Set(Array.isArray(files) ? files : [files])];
	const totalSize = fileList.reduce((sum, file) => sum + file.size, 0);
	if (totalSize < DEFAULT_UPLOAD_WARNING_BYTES) return true;
	// MCAは逐次展開し、生成メッシュ量を専用フォームの面数上限で管理する。
	if (
		fileList.every(file => /\.mca$/i.test(file.name))
		&& formatMca.limits.skipBatchWarning
	) return true;
	// フォルダのタイル本体は表示時に読むため、一括展開を前提としたサイズ確認は不要。
	if (
		fileList.length > 1 && (await findLocalTilesetFiles(fileList)).length
		&& format3dtiles.limits.skipBatchWarning
	) return true;
	if (
		isLocalRasterTileFolder(fileList)
		&& formatRaster.limits.skipBatchWarning
	) return true;
	const mvtFiles = fileList.filter(isMvtFile);
	if (
		mvtFiles.length && mvtFiles.every(file => parseMvtPath(file))
		&& fileList.every(file => isMvtFile(file) || /\.json$/i.test(file.name))
		&& formatVector.limits.skipBatchWarning
	) return true;

	const previous = confirmedGroups.get(fileList[0]);
	if (
		previous && previous.size === fileList.length
		&& fileList.every(file => previous.has(file))
	) return true;
	const accepted = await showConfirmDialog({
		message: `ファイルサイズが大きいです（${
			formatSize(totalSize)
		}）。動作が不安定になる可能性があります。続行しますか？`,
		confirmText: '続行',
		cancelText: 'キャンセル'
	});
	if (accepted) {
		const group = new Set(fileList);
		for (const file of fileList) confirmedGroups.set(file, group);
	}
	return accepted;
};
