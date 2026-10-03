import { hasFormatExtension } from '../format-definition';
import { formatS57 } from './definition';

export const isS57Base = (file: Pick<File, 'name'>) =>
	hasFormatExtension(file.name, formatS57.extensions);
export const isS57Update = (file: Pick<File, 'name'>) =>
	/\.(?!000$)\d{3}$/i.test(file.name) && !/^CATALOG\.031$/i.test(file.name);
export const S57_UPDATE_ERROR =
	'S-57の更新ファイル（.001以降）の適用は未対応です。更新済みの基本ファイル（.000）へ変換して読み込んでください';
export const checkS57File = (file: Pick<File, 'name' | 'size'>) => {
	if (isS57Update(file)) throw new Error(S57_UPDATE_ERROR);
	if (!isS57Base(file)) throw new Error('S-57の基本ファイル（.000）を選択してください');
	if (!file.size) throw new Error('S-57ファイルが空です');
	if (file.size > formatS57.limits.maxFileBytes) {
		throw new Error('S-57は64 MiB以下にしてください');
	}
};
