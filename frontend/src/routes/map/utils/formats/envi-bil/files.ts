export const rawRasterPath = (file: File) =>
	((file as File & { morivisRelativePath?: string; }).morivisRelativePath
		|| file.webkitRelativePath || file.name)
		.replaceAll('\\', '/').toLowerCase();
export const isRawRasterHeader = (file: File) => /\.hdr$/i.test(file.name);
export const isRawRasterMain = (file: File) => /\.(bil|bip|bsq)$/i.test(file.name);

export interface RawRasterFiles {
	header: File;
	data: File;
	prj: File | null;
	world: File | null;
}

/** 別フォルダ・別画像の付属ファイルは使わず、候補が重複したら選び直してもらう。 */
export const findRawRasterFiles = (files: File[], header: File): RawRasterFiles => {
	const path = rawRasterPath(header);
	if (files.filter(file => rawRasterPath(file) === path).length > 1) {
		throw new Error('同名のHDRが複数あります');
	}
	const stem = path.replace(/\.hdr$/, '');
	const candidates = files.filter(file => {
		const name = rawRasterPath(file);
		return name === stem
			|| (/\.(bil|bip|bsq|dat|img|raw|bin)$/i.test(name)
				&& name.replace(/\.[^.]+$/, '') === stem);
	});
	if (candidates.length === 0) {
		throw new Error(
			`${header.name}と同じ名前の画像本体（BIL・BIP・BSQ・DAT・IMGなど）を一緒に選択してください`
		);
	}
	if (candidates.length > 1) {
		throw new Error(
			`${header.name}に対応する画像本体が複数あります。読み込む一式だけを選択してください`
		);
	}
	const data = candidates[0];
	const dataPath = rawRasterPath(data);
	const base = dataPath.replace(/\.(bil|bip|bsq|dat|img|raw|bin)$/i, '');
	const select = (names: string[], label: string) => {
		const matches = files.filter(file => names.includes(rawRasterPath(file)));
		if (matches.length > 1) throw new Error(`${label}が複数あります。1つだけ選択してください`);
		return matches[0] ?? null;
	};
	return {
		header,
		data,
		prj: select([`${base}.prj`, `${dataPath}.prj`], 'PRJ'),
		world: select(
			[`${base}.blw`, `${base}.bpw`, `${base}.bqw`, `${base}.wld`, `${dataPath}w`],
			'ワールドファイル'
		)
	};
};
