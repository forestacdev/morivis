import { hasFormatExtension } from '../format-definition';
import { assertInputResourceLimits } from '../resource-limits';
import { formatMapinfoTab } from './definition';
export const MAX_TAB_BYTES = formatMapinfoTab.limits.maxDatasetBytes;
export const MAX_TAB_HEADER_BYTES = formatMapinfoTab.limits.maxHeaderBytes;
export const tabPath = (file: File) =>
	((file as File & { morivisRelativePath?: string; }).morivisRelativePath
		|| file.webkitRelativePath || file.name).replaceAll('\\', '/');
export const isMapInfoTab = (file: File) =>
	hasFormatExtension(file.name, formatMapinfoTab.files.mainExtensions);
export const isMapInfoSidecar = (file: File) =>
	hasFormatExtension(file.name, [
		...formatMapinfoTab.files.attributeExtensions,
		...formatMapinfoTab.files.requiredExtensions,
		...formatMapinfoTab.files.optionalExtensions
	]);

/** ヘッダーの文字コードを維持したままASCIIのFile参照だけを置換する。 */
const binaryText = (bytes: Uint8Array) => {
	let text = '';
	for (let i = 0; i < bytes.length; i += 8192) {
		text += String.fromCharCode(...bytes.subarray(i, i + 8192));
	}
	return text;
};

export const prepareMapInfoFiles = async (files: File[], tab: File): Promise<File[]> => {
	if (tab.size > MAX_TAB_HEADER_BYTES) throw new Error('TABヘッダーは1 MiB以下にしてください');
	const tabName = tabPath(tab).toLowerCase();
	const stem = tabName.replace(/\.tab$/, '');
	const folder = stem.slice(0, stem.lastIndexOf('/') + 1);
	const text = binaryText(new Uint8Array(await tab.arrayBuffer()));
	if (!/^\s*!table\b/i.test(text)) throw new Error('MapInfoのTABヘッダーではありません');
	const type = text.match(/^\s*Type\s+(\w+)/im)?.[1].toUpperCase();
	if (type !== 'NATIVE' && type !== 'DBF') {
		throw new Error(
			'Native／DBF形式のベクターTABに対応しています。ラスター・結合表・シームレス表は未対応です'
		);
	}
	const extension = type === 'DBF' ? 'dbf' : 'dat';
	const reference = text.match(/^\s*File\s+"([^"\r\n]+)"[^\r\n]*/im);
	let dataPath = `${stem}.${extension}`;
	if (reference) {
		const charset = text.match(/!charset\s+(\S+)/i)?.[1];
		const encoding = charset?.toLowerCase() === 'windowsjapanese' ? 'shift-jis' : 'utf-8';
		const decoded = new TextDecoder(encoding).decode(
			Uint8Array.from(reference[1], char => char.charCodeAt(0))
		).replaceAll('\\', '/').replace(/^\.\//, '');
		if (decoded.includes('/') || !decoded.toLowerCase().endsWith(`.${extension}`)) {
			throw new Error('TABが参照する属性ファイルを同じフォルダに置いてください');
		}
		dataPath = folder + decoded.toLowerCase();
	}
	const find = (path: string, label: string, required = true) => {
		const matches = files.filter(file => tabPath(file).toLowerCase() === path);
		if (matches.length > 1) {
			throw new Error(`${label}が重複しています。一式だけを選択してください`);
		}
		if (!matches.length && required) {
			throw new Error(
				`${label}がありません。TAB・${extension.toUpperCase()}・MAP・IDを一緒に選択してください`
			);
		}
		return matches[0];
	};
	find(tabName, 'TAB');
	const members = [
		find(dataPath, extension.toUpperCase()),
		...formatMapinfoTab.files.requiredExtensions.map(extension =>
			find(stem + extension, extension.slice(1).toUpperCase())
		),
		...formatMapinfoTab.files.optionalExtensions.map(extension =>
			find(stem + extension, extension.slice(1).toUpperCase(), false)
		)
	];
	assertInputResourceLimits([{
		name: tab.name,
		files: [tab, ...members.filter((file): file is File => !!file)]
	}], formatMapinfoTab.limits);
	const normalized = reference
		? text.replace(reference[0], `\n  File "table.${extension}"`)
		: text;
	const output = [
		new File([Uint8Array.from(normalized, char => char.charCodeAt(0))], 'table.tab')
	];
	const memberExtensions = [
		extension,
		...formatMapinfoTab.files.requiredExtensions.map(ext => ext.slice(1)),
		...formatMapinfoTab.files.optionalExtensions.map(ext => ext.slice(1))
	];
	for (const [index, file] of members.entries()) {
		if (file) output.push(new File([file], `table.${memberExtensions[index]}`));
	}
	return output;
};
