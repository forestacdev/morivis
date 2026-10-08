import { hasFormatExtension } from '../format-definition';
import { assertInputResourceLimits } from '../resource-limits';
import { formatS57 } from './definition';

export interface S57DatasetFiles {
	base: File;
	updates: File[];
}
export const S57_FILE_ACCEPT = [...formatS57.extensions, ...formatS57.files.optionalExtensions]
	.join(',');
export const isS57Base = (file: Pick<File, 'name'>) =>
	hasFormatExtension(file.name, formatS57.extensions);
export const isS57Update = (file: Pick<File, 'name'>) =>
	/\.(?!000$)\d{3}$/i.test(file.name) && !/(?:^|[/\\])CATALOG\.031$/i.test(file.name);
export const isS57File = (file: Pick<File, 'name'>) => isS57Base(file) || isS57Update(file);
export const checkS57File = (file: Pick<File, 'name' | 'size'>) => {
	if (!isS57File(file)) {
		throw new Error('S-57の基本ファイル（.000）と更新ファイル（.001以降）を選択してください');
	}
	if (!file.size) throw new Error('S-57ファイルが空です');
	if (file.size > formatS57.limits.maxFileBytes) {
		throw new Error('S-57は64 MiB以下にしてください');
	}
};
const datasetKey = (file: File) => {
	const path = (file as File & { morivisRelativePath?: string; }).morivisRelativePath
		|| file.webkitRelativePath || file.name;
	return path.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\.\d{3}$/, '').toLowerCase();
};
export const getS57Datasets = (input: readonly File[]): S57DatasetFiles[] => {
	const groups = new Map<string, File[]>();
	for (const file of input.filter(isS57File)) {
		checkS57File(file);
		const key = datasetKey(file);
		const files = groups.get(key) ?? [];
		files.push(file);
		groups.set(key, files);
	}
	return [...groups.values()].map(files => {
		const base = files.find(isS57Base);
		if (!base) {
			throw new Error(
				`更新ファイルには同じ名前の基本ファイル（.000）が必要です: ${files[0].name}`
			);
		}
		const numbers = files.map(file => Number(file.name.slice(-3)));
		if (new Set(numbers).size !== files.length) {
			throw new Error(`S-57の基本ファイル・更新番号が重複しています: ${base.name}`);
		}
		assertInputResourceLimits([{ name: base.name, files }], formatS57.limits);
		return {
			base,
			updates: files.filter(isS57Update).sort((a, b) =>
				Number(a.name.slice(-3)) - Number(b.name.slice(-3))
			)
		};
	});
};
