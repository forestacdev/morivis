import { assertInputResourceLimits, FORMAT_RESOURCE_LIMITS } from '../resource-limits';

export const isShapefileMember = (file: File): boolean =>
	/\.(shp|dbf|shx|prj|cpg)$/i.test(file.name);

/** ZIP・フォルダの相対パスを優先し、別フォルダの同名セットを混ぜない。 */
export const getShapefileDatasetKey = (file: File): string => {
	const path = (file as File & { morivisRelativePath?: string; }).morivisRelativePath
		|| file.webkitRelativePath || file.name;
	return path.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\.[^./]+$/, '');
};

export const getShapefileDataset = (input: readonly File[]) => {
	const files = [...new Set(input.filter(isShapefileMember))];
	const keys = new Set(files.map(getShapefileDatasetKey));
	if (keys.size > 1) {
		throw new Error('Shapefileは同じフォルダ・同じ基本名の一式だけを選択してください');
	}
	const extensions = files.map(file => file.name.split('.').pop()!.toLowerCase());
	if (new Set(extensions).size !== extensions.length) {
		throw new Error('Shapefileの同じ拡張子のファイルが重複しています');
	}
	const dataset = { name: keys.values().next().value ?? 'Shapefile', files };
	assertInputResourceLimits([dataset], FORMAT_RESOURCE_LIMITS.shp);
	return dataset;
};
