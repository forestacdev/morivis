import type JSZip from 'jszip';
import { children, parseXml } from '../xlsx/drawing-geometry';

const resolvePart = (source: string, target: string): string => {
	const parts = target.startsWith('/') ? [] : source.split('/').slice(0, -1);
	for (const part of target.split('/')) {
		if (part === '..') parts.pop();
		else if (part && part !== '.') parts.push(part);
	}
	return parts.join('/');
};

export const relationships = async (
	zip: JSZip,
	source: string,
	typeSuffix?: string
): Promise<Map<string, string>> => {
	const parts = source.split('/');
	const name = parts.pop();
	const file = zip.file([...parts, '_rels', `${name}.rels`].join('/'));
	if (!file) return new Map();
	const root = parseXml(await file.async('string'));
	return new Map(
		children(root, 'Relationship')
			.filter((item) =>
				item.getAttribute('TargetMode') !== 'External'
				&& (!typeSuffix || item.getAttribute('Type')?.endsWith(typeSuffix))
			)
			.map((
				item
			) => [
				item.getAttribute('Id') ?? '',
				resolvePart(source, item.getAttribute('Target') ?? '')
			])
	);
};

export const relationshipId = (element: Element): string =>
	Array.from(element.attributes).find((attr) =>
		attr.localName === 'id' && !!attr.namespaceURI?.endsWith('/relationships')
	)?.value ?? '';

// Do not embed SVG/HTML or arbitrary relationship targets in the generated image.
const rasterImageMime = (bytes: Uint8Array): string | undefined => {
	const starts = (signature: number[]) =>
		signature.every((value, index) => bytes[index] === value);
	if (starts([137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png';
	if (starts([255, 216, 255])) return 'image/jpeg';
	if (starts([71, 73, 70, 56]) && [55, 57].includes(bytes[4]) && bytes[5] === 97) {
		return 'image/gif';
	}
	if (starts([82, 73, 70, 70]) && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
		return 'image/webp';
	}
	return undefined;
};

export const readEmbeddedImages = async (
	zip: JSZip,
	source: string
): Promise<Map<string, string>> => {
	const rels = await relationships(zip, source, '/image');
	const images = new Map<string, string>();
	await Promise.all([...rels].map(async ([id, path]) => {
		const file = zip.file(path);
		if (!file) return;
		const mime = rasterImageMime(await file.async('uint8array'));
		if (mime) images.set(id, `data:${mime};base64,${await file.async('base64')}`);
	}));
	return images;
};

export const readPart = async (zip: JSZip, path: string): Promise<string> => {
	const file = zip.file(path);
	if (!file) throw new Error('Officeファイル内の参照先が見つかりません');
	return file.async('string');
};
