import type { McaRegionPosition } from './types';
import { parseMcaRegionFileName } from './world-placement';

export const validateMcaFileSet = (files: Pick<File, 'name'>[]): McaRegionPosition[] => {
	if (!files.length) throw new Error('.mcaファイルを選んでください');
	const seen = new Set<string>();
	return files.map(file => {
		const region = parseMcaRegionFileName(file.name);
		if (!region) throw new Error(`${file.name}: 元のファイル名 r.x.z.mca を使用してください`);
		const key = `${region.x},${region.z}`;
		if (seen.has(key)) {
			throw new Error(
				`${file.name}: 同じリージョンが重複しています。同じワールド・ディメンションのファイルを選んでください`
			);
		}
		seen.add(key);
		return region;
	});
};
