import JSZip from 'jszip';

export interface FbxPackageImage {
	id: string;
	blob: Blob;
	cutout?: Blob;
}

export interface FbxPackage {
	images: Map<string, FbxPackageImage>;
	instanceProperties: string;
}

const GUID = /[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi;

/** ZIPはFBX末尾だけでなく、ノード内のrawプロパティに格納される場合もある。 */
const extractPackage = (buffer: ArrayBuffer) => {
	const view = new DataView(buffer);
	for (let end = buffer.byteLength - 22; end >= 0; end -= 1) {
		if (view.getUint32(end, true) !== 0x06054b50) continue;
		const size = view.getUint32(end + 12, true);
		const offset = view.getUint32(end + 16, true);
		const start = end - size - offset;
		const limit = end + 22 + view.getUint16(end + 20, true);
		if (start < 0 || start + 4 > end || limit > buffer.byteLength || size < 46) continue;
		if (
			view.getUint32(start, true) !== 0x04034b50
			|| view.getUint32(end - size, true) !== 0x02014b50
		) continue;
		return new Uint8Array(buffer, start, limit - start);
	}
	return undefined;
};

/** Autodesk Design Packageの画像を読む。モデル・材質名から画像を推測しない。 */
export const readFbxPackage = async (buffer: ArrayBuffer): Promise<FbxPackage> => {
	const result: FbxPackage = { images: new Map(), instanceProperties: '' };
	const bytes = extractPackage(buffer);
	if (!bytes) return result;
	try {
		const zip = await JSZip.loadAsync(bytes);
		const colors = new Map<string, FbxPackageImage>();
		const masks = new Map<string, FbxPackageImage>();
		for (const entry of Object.values(zip.files)) {
			if (entry.dir) continue;
			if (entry.name.endsWith('AssetData/InstanceProperties.bin')) {
				result.instanceProperties = new TextDecoder('latin1').decode(
					await entry.async('uint8array')
				);
				continue;
			}
			const id = entry.name.match(/(?:^|\/)Resources\/([0-9a-f-]{36})\//i)?.[1]
				?.toUpperCase();
			if (!id || !/_(png|jpe?g)$/i.test(entry.name)) continue;
			try {
				const data = await entry.async('uint8array');
				const image: FbxPackageImage = {
					id,
					blob: new Blob([data as BlobPart], {
						type: /_png$/i.test(entry.name) ? 'image/png' : 'image/jpeg'
					})
				};
				result.images.set(id, image);
				const name = decodeURIComponent(entry.name.split('/').pop() ?? '');
				const base = name.replace(/[-_](b|cutout)(?:[-_].*)?$/i, '');
				if (/[-_]cutout[-_]/i.test(name)) masks.set(base, image);
				else if (/[-_]b[-_]/i.test(name)) colors.set(base, image);
			} catch {
				// 壊れた画像だけを飛ばし、他の材質の復元を続ける。
			}
		}
		for (const [base, color] of colors) {
			const mask = masks.get(base);
			if (!mask) continue;
			color.cutout = mask.blob;
			result.images.set(mask.id, color);
		}
	} catch {
		// 通常のFBX表示は、パッケージの破損で中断しない。
	}
	return result;
};

export const resolveFbxAssetImage = (pkg: FbxPackage, asset: string) => {
	const at = pkg.instanceProperties.toUpperCase().indexOf(asset.toUpperCase());
	if (at < 0) return undefined;
	// InstancePropertiesの参照列には型定義GUIDも含まれるため、画像として存在するIDだけを採用する。
	const references = pkg.instanceProperties.slice(at + asset.length, at + asset.length + 2000);
	for (const id of references.match(GUID) ?? []) {
		const image = pkg.images.get(id.toUpperCase());
		if (image) return image;
	}
	return undefined;
};
