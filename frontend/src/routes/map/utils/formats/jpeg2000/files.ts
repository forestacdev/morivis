export const jp2Path = (file: File) =>
	((file as File & { morivisRelativePath?: string; }).morivisRelativePath
		|| file.webkitRelativePath || file.name).replaceAll('\\', '/');
export const isJp2File = (file: File) => /\.jp2$/i.test(file.name);
export const isJp2Sidecar = (file: File) => /\.(j2w|jp2w|wld|prj|aux\.xml)$/i.test(file.name);
export interface Jp2Files {
	image: File;
	world?: File;
	prj?: File;
	aux?: File;
}
export const findJp2Files = (files: File[], image: File): Jp2Files => {
	const path = jp2Path(image).toLowerCase(), stem = path.replace(/\.jp2$/, '');
	const find = (names: string[], label: string) => {
		const matches = files.filter(file => names.includes(jp2Path(file).toLowerCase()));
		if (matches.length > 1) {
			throw new Error(`${label}が重複しています。一式だけを選択してください`);
		}
		return matches[0];
	};
	find([path], 'JP2');
	return {
		image,
		world: find(['.j2w', '.jp2w', '.wld'].map(ext => stem + ext), 'ワールドファイル'),
		prj: find([stem + '.prj', path + '.prj'], 'PRJ'),
		aux: find([path + '.aux.xml', stem + '.aux.xml'], 'AUX.XML')
	};
};
