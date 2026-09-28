/** UI・Workerから参照する処理上限。未指定は「明示的な上限なし」であり、処理可能量の保証ではない。 */
export const MiB = 1024 * 1024;
export const DEFAULT_UPLOAD_WARNING_BYTES = 100 * MiB;

export interface InputResourceLimits {
	maxFileBytes?: number;
	maxDatasetBytes?: number;
	maxBatchBytes?: number;
	maxFiles?: number;
	/** 逐次処理・タイル参照の入力は、合計容量による共通警告を省く。 */
	skipBatchWarning?: boolean;
}

export type SizedInput = { name: string; size: number; };
export type InputDataset = { name: string; files: readonly SizedInput[]; };
export type InputLimitViolation = {
	scope: 'file' | 'dataset' | 'batch' | 'file-count';
	name: string;
	actual: number;
	limit: number;
};

/** 一式の組み立ては呼び出し元で行う。同じファイルが重複していても容量は一度だけ数える。 */
export const checkInputResourceLimits = (
	datasets: readonly InputDataset[],
	limits: InputResourceLimits
): InputLimitViolation | null => {
	const files = [...new Set(datasets.flatMap(dataset => dataset.files))];
	if (limits.maxFiles !== undefined && files.length > limits.maxFiles) {
		return { scope: 'file-count', name: '', actual: files.length, limit: limits.maxFiles };
	}
	for (const file of files) {
		if (limits.maxFileBytes !== undefined && file.size > limits.maxFileBytes) {
			return {
				scope: 'file',
				name: file.name,
				actual: file.size,
				limit: limits.maxFileBytes
			};
		}
	}
	for (const dataset of datasets) {
		const size = [...new Set(dataset.files)].reduce((sum, file) => sum + file.size, 0);
		if (limits.maxDatasetBytes !== undefined && size > limits.maxDatasetBytes) {
			return {
				scope: 'dataset',
				name: dataset.name,
				actual: size,
				limit: limits.maxDatasetBytes
			};
		}
	}
	const size = files.reduce((sum, file) => sum + file.size, 0);
	if (limits.maxBatchBytes !== undefined && size > limits.maxBatchBytes) {
		return { scope: 'batch', name: '', actual: size, limit: limits.maxBatchBytes };
	}
	return null;
};

export const assertInputResourceLimits = (
	datasets: readonly InputDataset[],
	limits: InputResourceLimits
): void => {
	const violation = checkInputResourceLimits(datasets, limits);
	if (!violation) return;
	if (violation.scope === 'file-count') {
		throw new Error(`ファイル数は${violation.limit}個以下にしてください`);
	}
	const target = violation.scope === 'file'
		? violation.name
		: violation.scope === 'dataset'
		? `${violation.name}一式の合計`
		: '入力全体の合計';
	throw new Error(`${target}は${violation.limit / MiB} MiB以下にしてください`);
};
