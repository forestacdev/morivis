import { normalizeRikPath, type RikArchiveFile } from './cabinet';

const TEXTURE_PATTERN = /\.(png|jpe?g|bmp|tga|gif|webp|dds)$/i;
const MIME_TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	bmp: 'image/bmp',
	gif: 'image/gif',
	webp: 'image/webp'
};

/** 展開結果から3DSと画像だけを既存MeshEntry登録フローへ渡す。 */
export const createRikModelFiles = (entries: RikArchiveFile[]): File[] => {
	const models = entries.filter(({ path }) => /\.3ds$/i.test(path));
	if (!models.length) {
		if (entries.some(({ path }) => /\.gsm$/i.test(path))) {
			throw new Error(
				'GSMを格納したRIKには対応していません。3DSとテクスチャを書き出してください'
			);
		}
		throw new Error('RIK内に3DSモデルがありません');
	}
	const infoFiles = entries.filter(({ path }) => /(^|\/)info\.ini$/i.test(path));
	if (infoFiles.length > 1) {
		throw new Error('RIK内に複数のInfo.iniがあり、モデルを特定できません');
	}
	const info = infoFiles[0];
	let model: RikArchiveFile | undefined;
	if (info) {
		const text = new TextDecoder('shift-jis').decode(info.data);
		const section = text.match(/^\s*\[3DS_DATA\]\s*$([\s\S]*?)(?=^\s*\[|$(?![\s\S]))/im)?.[1];
		const name = section?.match(/^\s*3DS_FILE_NAME\s*=\s*(.*?)\s*$/im)?.[1]?.replace(
			/^"(.*)"$/,
			'$1'
		);
		if (name) {
			const directory = info.path.slice(0, info.path.lastIndexOf('/') + 1);
			const path = normalizeRikPath(directory + normalizeRikPath(name)).toLowerCase();
			model = models.find((entry) => entry.path.toLowerCase() === path);
			if (!model) throw new Error('Info.iniで指定された3DSモデルがRIK内にありません');
		}
	}
	if (!model) {
		if (models.length !== 1) {
			throw new Error('RIK内に複数の3DSモデルがあり、モデルを特定できません');
		}
		model = models[0];
	}
	const view = new DataView(model.data.buffer, model.data.byteOffset, model.data.byteLength);
	if (
		view.byteLength < 6 || view.getUint16(0, true) !== 0x4d4d
		|| view.getUint32(2, true) !== view.byteLength
	) {
		throw new Error('RIK内の3DSモデルが破損しています');
	}
	return [model, ...entries.filter(({ path }) => TEXTURE_PATTERN.test(path))].map(
		({ path, data }) => {
			const name = path.split('/').pop()!;
			const file = new File([data], name, {
				type: MIME_TYPES[name.split('.').pop()!.toLowerCase()] ?? ''
			});
			Object.defineProperty(file, 'morivisRelativePath', { value: path, configurable: true });
			return file;
		}
	);
};
