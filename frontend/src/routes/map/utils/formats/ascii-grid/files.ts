const pathName = (file: File) =>
	((file as File & { morivisRelativePath?: string; }).morivisRelativePath
		|| file.webkitRelativePath || file.name).replaceAll('\\', '/').toLowerCase();

export const isAsciiGridFile = (file: File) => /\.asc$/i.test(pathName(file));

/** 同じフォルダ・同じベース名だけを対応付け、別図郭のPRJを流用しない。 */
export const findAsciiGridPrj = (files: File[], gridFile: File): File | null => {
	const expected = pathName(gridFile).replace(/\.asc$/, '.prj');
	const matches = files.filter(file => pathName(file) === expected);
	if (matches.length > 1) {
		throw new Error('同名のPRJが複数あります。座標系ファイルを1つにしてください');
	}
	return matches[0] ?? null;
};
