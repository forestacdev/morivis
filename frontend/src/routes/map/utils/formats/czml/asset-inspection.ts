import { inspectGltfFile } from '../gltf';
import type { CzmlResult } from '.';
import { czmlModelLimits, formatCzml } from './definition';
import { createCzmlAssetLocator } from './model-assets';

/** GLBはJSONチャンクだけを読む。ジオメトリ・画像のデコードや通信は行わない。 */
const inspectModel = async (file: File, signal: AbortSignal) => {
	signal.throwIfAborted();
	if (file.size > czmlModelLimits.maxBytes) {
		throw new Error('CZMLのモデルファイルが128 MiBを超えています');
	}
	const header = await file.slice(0, 20).arrayBuffer();
	signal.throwIfAborted();
	const view = new DataView(header);
	let json = file;
	if (header.byteLength >= 4 && view.getUint32(0, true) === 0x46546c67) {
		if (
			header.byteLength < 20 || view.getUint32(4, true) !== 2
			|| view.getUint32(8, true) !== file.size || view.getUint32(16, true) !== 0x4e4f534a
		) {
			throw new Error(`GLBのヘッダーが不正です: ${file.name}`);
		}
		const length = view.getUint32(12, true);
		if (length % 4 !== 0 || 20 + length > file.size) {
			throw new Error(`GLBのJSON長が不正です: ${file.name}`);
		}
		json = new File([file.slice(20, 20 + length)], file.name);
	}
	if (json.size > formatCzml.limits.maxFileBytes) {
		throw new Error('glTFのJSONが32 MiBを超えています');
	}
	const inspection = await inspectGltfFile(json);
	signal.throwIfAborted();
	return [...inspection.externalBufferUris, ...inspection.externalImageUris];
};

/** 選択中の表示に必要なローカル参照のみ検査する。公開URLは登録時に取得する。 */
export const inspectCzmlAssets = async (
	result: CzmlResult,
	document: File,
	files: File[],
	signal: AbortSignal,
	type: 'models' | 'billboards'
): Promise<string[]> => {
	signal.throwIfAborted();
	const locator = createCzmlAssetLocator(document, files);
	const references = type === 'models'
		? result.models.map(model => model.uri)
		: result.billboards.features.map(feature => feature.properties?.billboard_image)
			.filter((uri): uri is string => typeof uri === 'string');
	const missing = new Set<string>();
	const locate = (url: string) => {
		const path = locator.localPath(url);
		if (path === null) return undefined;
		const file = locator.findLocalFile(url);
		if (!file) missing.add(path.replace(/^\//, ''));
		return file;
	};
	for (const url of new Set(references.map(uri => locator.resolve(uri)))) {
		signal.throwIfAborted();
		const file = locate(url);
		if (file && type === 'models') {
			for (const uri of await inspectModel(file, signal)) locate(locator.resolve(uri, url));
		}
	}
	signal.throwIfAborted();
	return [...missing];
};
