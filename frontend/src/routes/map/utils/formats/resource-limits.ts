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

// バイナリ仕様のヘッダー長などは各パーサーに残す。ここにはアプリの処理上限を置く。
export const FORMAT_RESOURCE_LIMITS = {
	shp: {},
	'osm-pbf': {
		maxFileBytes: 64 * MiB,
		maxOutputBytes: 128 * MiB,
		maxFeatures: 500_000,
		timeoutMs: 120_000
	},
	fit: { maxFileBytes: 64 * MiB, timeoutMs: 120_000 },
	jwc: { maxFileBytes: 64 * MiB },
	bds: { maxFileBytes: 32 * MiB, maxBatchBytes: 32 * MiB, maxFiles: 32, maxFeatures: 500_000 },
	gcd: {
		maxFileBytes: 128 * MiB,
		maxBatchBytes: 128 * MiB,
		maxFiles: 32,
		maxFeatures: 200_000,
		maxVertices: 2_000_000
	},
	e57: { maxFileBytes: 256 * MiB, maxSourcePoints: 5_000_000, maxDisplayPoints: 1_000_000 },
	'mapinfo-tab': {
		maxDatasetBytes: 256 * MiB,
		maxHeaderBytes: MiB,
		maxFeatures: 500_000,
		maxVertices: 5_000_000,
		timeoutMs: 120_000
	},
	jpeg2000: {
		maxFileBytes: 256 * MiB,
		maxSamples: 16 * MiB,
		maxMetadataBytes: MiB,
		timeoutMs: 120_000
	},
	rik: { maxFileBytes: 256 * MiB, maxExpandedBytes: 512 * MiB, maxFiles: 4096 },
	mca: {
		maxFileBytes: 256 * MiB,
		maxNbtBytes: 32 * MiB,
		maxSections: 32_768,
		skipBatchWarning: true
	},
	'envi-bil': { maxFileBytes: 512 * MiB, maxHeaderBytes: MiB, maxSamples: 16 * MiB },
	// 文字数はUTF-16コード単位。ファイルのバイト数とは区別する。
	cedxm: { maxTextLength: 64 * MiB },
	'sql-dump': { maxTextLength: 256 * MiB },
	'local-3dtiles': { skipBatchWarning: true },
	'local-mvt': { skipBatchWarning: true },
	'local-raster-tiles': { skipBatchWarning: true }
} as const;

export type ResourceLimitKey = keyof typeof FORMAT_RESOURCE_LIMITS;
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
