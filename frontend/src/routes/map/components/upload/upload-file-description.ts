import type { MorivisLayerEntry } from '$routes/map/data/types';

const FILE_NAME_PREVIEW_LIMIT = 5;

const formatFileSize = (byteSize: number): string => {
	if (!Number.isFinite(byteSize) || byteSize <= 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
	const unitIndex = Math.min(Math.floor(Math.log(byteSize) / Math.log(1024)), units.length - 1);
	const value = byteSize / 1024 ** unitIndex;
	const formatted = new Intl.NumberFormat('ja-JP', {
		maximumFractionDigits: unitIndex === 0 ? 0 : 1
	}).format(value);

	return `${formatted} ${units[unitIndex]}`;
};

const uniqueFiles = (files: File[]): File[] => {
	const seen = new Set<string>();
	return files.filter((file) => {
		const key = `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const formatFileNames = (files: File[]): string => {
	const visibleNames = files.slice(0, FILE_NAME_PREVIEW_LIMIT).map((file) => file.name);
	const remainingCount = files.length - visibleNames.length;
	return remainingCount > 0
		? `${visibleNames.join('、')}、ほか${remainingCount.toLocaleString('ja-JP')}件`
		: visibleNames.join('、');
};

export const mergeUploadFileDescription = (
	description: string | undefined,
	inputFiles: File[]
): string | undefined => {
	const files = uniqueFiles(inputFiles);
	if (files.length === 0) return description;

	const current = description?.trim() ?? '';
	if (current.includes('ファイル名:') || current.includes('構成ファイル:')) return current;

	const totalSize = files.reduce((sum, file) => sum + file.size, 0);
	const hasFileSize = current.includes('ファイルサイズ:');
	const fileInformation = files.length === 1
		? `ファイル名: ${files[0].name}${
			hasFileSize ? '' : `、ファイルサイズ: ${formatFileSize(totalSize)}`
		}。`
		: `構成ファイル: ${files.length.toLocaleString('ja-JP')}件（${formatFileNames(files)}）${
			hasFileSize ? '' : `、合計ファイルサイズ: ${formatFileSize(totalSize)}`
		}。`;

	if (!current) return fileInformation;
	return `${/[。.!?]$/.test(current) ? current : `${current}。`}${fileInformation}`;
};

export const mergeUploadFiles = (current: File[], additions: File[]): File[] =>
	uniqueFiles([...current, ...additions]);

export const withUploadFileDescription = <T extends MorivisLayerEntry>(
	entry: T,
	files: File[]
): T => {
	const description = mergeUploadFileDescription(entry.metaData.description, files);
	if (description === entry.metaData.description) return entry;

	return {
		...entry,
		metaData: {
			...entry.metaData,
			description
		}
	} as T;
};
