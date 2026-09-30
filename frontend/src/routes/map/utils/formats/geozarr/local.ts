import JSZip from 'jszip';
import type { AsyncReadable, GetOptions, RangeQuery } from 'zarrita';
import { formatGeoZarr } from './definition';

export type LocalGeoZarrInput =
	| { type: 'folder'; files: { path: string; file: File; }[]; }
	| { type: 'zip'; file: File; };

export const getLocalZarrPath = (file: File): string =>
	(file as File & { morivisRelativePath?: string; }).morivisRelativePath
	|| file.webkitRelativePath || file.name;
const marker = /(?:^|\/)(?:\.zgroup|\.zarray|\.zmetadata|zarr\.json)$/;
const ignored = (path: string) =>
	path.split('/').some(part =>
		part === '__MACOSX' || part.startsWith('._') || part === '.DS_Store'
	);
const normalizePath = (path: string) => {
	const value = path.replace(/\\/g, '/');
	if (value.startsWith('/') || value.split('/').some(part => part === '..' || part === '.')) {
		throw new Error('Zarr内に不正な相対パスがあります');
	}
	return value;
};
export const isLocalGeoZarrFolder = (files: readonly File[]): boolean =>
	files.some(file => !ignored(getLocalZarrPath(file)) && marker.test(getLocalZarrPath(file)));

const zipCache = new WeakMap<File, Promise<JSZip>>();
const openZip = (file: File) => {
	let opening = zipCache.get(file);
	if (!opening) {
		opening = file.arrayBuffer().then(bytes => JSZip.loadAsync(bytes));
		zipCache.set(file, opening);
	}
	return opening;
};
export const isGeoZarrZip = async (file: File): Promise<boolean> => {
	if (!/\.zip$/i.test(file.name)) return false;
	try {
		const zip = await openZip(file);
		return Object.values(zip.files).some(entry =>
			!entry.dir && !ignored(entry.name) && marker.test(entry.name)
		);
	} catch {
		return false;
	} finally {
		// 判定側に圧縮データを残さず、描画Workerが読み込み元を所有する。
		zipCache.delete(file);
	}
};

const findRoot = (paths: string[]) => {
	const roots = [
		...new Set(
			paths.filter(path => marker.test(path)).map(path =>
				path.slice(0, path.lastIndexOf('/') + 1)
			)
		)
	];
	const top = roots.filter(root =>
		!roots.some(other => other !== root && root.startsWith(other))
	);
	if (top.length !== 1) {
		throw new Error(
			top.length
				? 'Zarrフォルダーは1つずつ登録してください'
				: 'Zarrのメタデータが見つかりません'
		);
	}
	return top[0];
};
const readZipEntry = (
	entry: JSZip.JSZipObject,
	limit: number,
	signal?: AbortSignal
): Promise<Uint8Array> => {
	signal?.throwIfAborted();
	return new Promise((resolve, reject) => {
		// JSZipには実装されているが、配布型定義にないストリームAPI。
		const stream = (entry as JSZip.JSZipObject & {
			internalStream: (type: 'uint8array') => JSZip.JSZipStreamHelper<Uint8Array>;
		}).internalStream('uint8array');
		const parts: Uint8Array[] = [];
		let size = 0, ended = false;
		const fail = (error: unknown) => {
			if (ended) return;
			ended = true;
			stream.pause();
			signal?.removeEventListener('abort', abort);
			parts.length = 0;
			reject(error);
		};
		const abort = () => fail(signal?.reason);
		signal?.addEventListener('abort', abort, { once: true });
		stream.on('data', (bytes: Uint8Array) => {
			if (ended) return;
			size += bytes.byteLength;
			if (size > limit) {
				return fail(
					new Error(
						`Zarrのファイル展開量が上限（${limit / 1024 / 1024} MiB）を超えました`
					)
				);
			}
			parts.push(bytes);
		});
		stream.on('error', fail);
		stream.on('end', () => {
			if (ended) return;
			ended = true;
			signal?.removeEventListener('abort', abort);
			const bytes = new Uint8Array(size);
			let offset = 0;
			for (const part of parts) {
				bytes.set(part, offset);
				offset += part.length;
			}
			resolve(bytes);
		});
		stream.resume();
	});
};
export type LocalGeoZarrStore = AsyncReadable & {
	contents: () => { path: string; kind: 'array' | 'group'; }[];
};
export const createLocalGeoZarrStore = async (
	input: LocalGeoZarrInput
): Promise<LocalGeoZarrStore> => {
	const entries = new Map<string, File | JSZip.JSZipObject>();
	const add = (path: string, file: File | JSZip.JSZipObject) => {
		if (ignored(path)) return;
		path = normalizePath(path);
		if (entries.has(path)) throw new Error(`Zarr内でパスが重複しています: ${path}`);
		entries.set(path, file);
	};
	if (input.type === 'zip') {
		if (input.file.size > formatGeoZarr.limits.maxFileBytes) {
			throw new Error('Zarr ZIPは256 MiB以下にしてください');
		}
		const zip = await openZip(input.file);
		for (const entry of Object.values(zip.files)) {
			if (entry.dir) continue;
			const original =
				(entry as JSZip.JSZipObject & { unsafeOriginalName?: string; }).unsafeOriginalName;
			if (original) normalizePath(original);
			add(entry.name, entry);
		}
	} else {
		for (const item of input.files) add(item.path, item.file);
	}
	if (entries.size > formatGeoZarr.limits.maxFiles) {
		throw new Error(`Zarr内のファイル数は${formatGeoZarr.limits.maxFiles}個以下にしてください`);
	}
	const root = findRoot([...entries.keys()]);
	const files = new Map(
		[...entries].filter(([path]) => path.startsWith(root)).map((
			[path, file]
		) => [`/${path.slice(root.length)}`, file])
	);
	const read = async (key: string, range?: RangeQuery, options?: GetOptions) => {
		options?.signal?.throwIfAborted();
		const file = files.get(key);
		if (!file) return undefined;
		const limit = /(?:^|\/)(?:\.z\w+|zarr\.json)$/.test(key)
			? formatGeoZarr.limits.maxMetadataBytes
			: formatGeoZarr.limits.maxExpandedBytes;
		let blob: Blob;
		if (file instanceof Blob) blob = file;
		else {blob = new Blob([
				await readZipEntry(file, limit, options?.signal) as Uint8Array<ArrayBuffer>
			]);}
		if (range) {
			blob = 'suffixLength' in range
				? blob.slice(-range.suffixLength)
				: blob.slice(range.offset, range.offset + range.length);
		}
		if (blob.size > limit) {
			throw new Error(`Zarrの読み取り量が上限（${limit / 1024 / 1024} MiB）を超えました`);
		}
		const bytes = new Uint8Array(await blob.arrayBuffer());
		options?.signal?.throwIfAborted();
		return bytes;
	};
	return {
		get: (key, options) => read(key, undefined, options),
		getRange: (key, range, options) => read(key, range, options),
		// v3はgroupも含む。呼び出し元のopen(kind: array)で配列だけに絞る。
		contents: () =>
			[...files.keys()].filter(path => /\/(?:\.zarray|zarr\.json)$/.test(path)).map(path => ({
				path: path.slice(0, path.lastIndexOf('/')) || '/',
				kind: 'array' as const
			}))
	};
};
