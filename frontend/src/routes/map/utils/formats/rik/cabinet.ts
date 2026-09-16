export interface CabinetFile {
	path: string;
	size: number;
}

export interface RikArchiveFile {
	path: string;
	data: Uint8Array<ArrayBuffer>;
}

// Workerごとに独立したWASM/MEMFSを作る。ホストのファイルシステムはマウントしない。
export interface CabinetRuntime {
	FS: {
		writeFile: (path: string, data: Uint8Array) => void;
		readFile: (path: string) => Uint8Array;
	};
	callMain: (args: string[]) => number;
}

export type CabinetRuntimeFactory = (options: {
	locateFile?: (path: string) => string;
	wasmBinary?: Uint8Array;
	print: (message: string) => void;
	printErr: (message: string) => void;
}) => Promise<CabinetRuntime>;

export const MAX_RIK_BYTES = 256 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 512 * 1024 * 1024;
const MAX_FILES = 4096;

export const normalizeRikPath = (path: string): string => {
	const normalized = path.replace(/\\/g, '/').replace(/^(\.\/)+/, '');
	if (
		!normalized || normalized.startsWith('/') || normalized.includes(':')
		|| normalized.split('/').some((part) => !part || part === '..' || part === '.')
	) {
		throw new Error('RIK内のファイルパスが不正です');
	}
	return normalized;
};

/** CABのファイル表を先に検証し、分割CABや過大な展開をWASMへ渡さない。 */
export const inspectRikCabinet = (buffer: ArrayBuffer): CabinetFile[] => {
	const bytes = new Uint8Array(buffer);
	const view = new DataView(buffer);
	if (bytes.length < 36 || view.getUint32(0, true) !== 0x4643534d) {
		throw new Error('RIKファイルはCAB形式ではありません');
	}
	if (bytes.length > MAX_RIK_BYTES) throw new Error('RIKファイルは256 MB以下にしてください');
	if (view.getUint32(8, true) !== bytes.length) throw new Error('RIKファイルが破損しています');
	if (view.getUint16(30, true) & 3) throw new Error('分割されたRIK/CABには対応していません');
	const folders = view.getUint16(26, true);
	const count = view.getUint16(28, true);
	if (!count || count > MAX_FILES) throw new Error('RIK内のファイル数が対応範囲外です');
	let offset = view.getUint32(16, true);
	let totalSize = 0;
	const paths = new Set<string>();
	const files: CabinetFile[] = [];
	for (let i = 0; i < count; i++) {
		if (offset < 36 || offset + 16 >= bytes.length) {
			throw new Error('RIKのファイル一覧が破損しています');
		}
		const size = view.getUint32(offset, true);
		const folder = view.getUint16(offset + 8, true);
		if (folder >= folders) throw new Error('分割または不正なRIK/CABには対応していません');
		const utf8 = (view.getUint16(offset + 14, true) & 0x80) !== 0;
		const end = bytes.indexOf(0, offset + 16);
		if (end < 0 || end - offset > 4096) throw new Error('RIK内のファイル名が不正です');
		const path = normalizeRikPath(
			new TextDecoder(utf8 ? 'utf-8' : 'shift-jis').decode(bytes.subarray(offset + 16, end))
		);
		if (paths.has(path.toLowerCase())) throw new Error('RIK内のファイル名が重複しています');
		paths.add(path.toLowerCase());
		totalSize += size;
		if (size > MAX_RIK_BYTES || totalSize > MAX_EXPANDED_BYTES) {
			throw new Error('RIKの展開サイズが上限（1ファイル256 MB、合計512 MB）を超えています');
		}
		files.push({ path, size });
		offset = end + 1;
	}
	return files;
};

export const extractRikCabinet = (
	buffer: ArrayBuffer,
	runtime: CabinetRuntime
): RikArchiveFile[] => {
	const files = inspectRikCabinet(buffer);
	runtime.FS.writeFile('/input.cab', new Uint8Array(buffer));
	const code = runtime.callMain([
		'x',
		'/input.cab',
		'-o/output',
		'-tCab',
		'-y',
		'-bd',
		'-bso0',
		'-bsp0',
		'-bse0'
	]);
	if (code !== 0) throw new Error('RIKのCAB展開に失敗しました。ファイルの破損を確認してください');
	return files.map(({ path, size }) => {
		let data: Uint8Array;
		try {
			data = runtime.FS.readFile(`/output/${path}`);
		} catch {
			throw new Error(`RIK内のファイルを展開できませんでした: ${path}`);
		}
		if (data.length !== size) throw new Error(`RIK内のファイルサイズが一致しません: ${path}`);
		return { path, data: new Uint8Array(data) };
	});
};
