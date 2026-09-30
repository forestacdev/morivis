import { resolveCogProxyUrl } from '$routes/map/utils/platform/request';

import { GeoTIFF } from './reader';

const BLOCK_SIZE = 64 * 1024;
const MAX_METADATA_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES = 16;
const MAX_PREVIEW_PIXELS = 512 * 512;

class RangeUnsupportedError extends Error {}

/**
 * Range取得・位置情報・内部タイル・縮小画像から、COG登録に適したTIFFかを調べる。
 * OGCの完全な適合性検査ではない。画素は復号せず、取得量とIFD数を制限する。
 * 通信失敗や上限超過は呼び出し元へ返し、全体取得へ自動フォールバックさせない。
 */
export const probeCogUrl = async (url: string): Promise<'cog' | 'geotiff'> => {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 20_000);
	const blocks = new Map<number, Uint8Array>();
	let transferred = 0;
	let fileSize: number | undefined;
	const requestUrl = resolveCogProxyUrl(url);

	const readBlock = async (offset: number): Promise<Uint8Array> => {
		const cached = blocks.get(offset);
		if (cached) return cached;
		if (transferred + BLOCK_SIZE > MAX_METADATA_BYTES) {
			throw new Error(
				'COGの判定に必要なメタ情報が取得上限を超えました。STAC / COGフォームで確認してください。'
			);
		}
		const response = await fetch(requestUrl, {
			headers: { Range: `bytes=${offset}-${offset + BLOCK_SIZE - 1}` },
			signal: controller.signal
		});
		if (response.status !== 206) {
			await response.body?.cancel();
			if (response.status === 200) throw new RangeUnsupportedError();
			throw new Error(`COGの判定に失敗しました: HTTP ${response.status}`);
		}
		const range = /^bytes (\d+)-(\d+)\/(\d+)$/i.exec(
			response.headers.get('content-range') ?? ''
		);
		if (
			!range || Number(range[1]) !== offset || Number(range[2]) < offset
			|| Number(range[2]) >= offset + BLOCK_SIZE || !Number.isSafeInteger(Number(range[3]))
			|| Number(range[2]) !== Math.min(offset + BLOCK_SIZE, Number(range[3])) - 1
			|| Number(range[3]) <= Number(range[2])
			|| (fileSize !== undefined && fileSize !== Number(range[3]))
		) {
			await response.body?.cancel();
			throw new Error('COGの部分取得応答（Content-Range）が不正、または参照できません。');
		}
		fileSize = Number(range[3]);
		const expected = Number(range[2]) - offset + 1;
		const bytes = new Uint8Array(expected);
		const reader = response.body?.getReader();
		if (!reader) throw new Error('COGの応答本文を取得できません。');
		let length = 0;
		try {
			while (true) {
				const chunk = await reader.read();
				if (chunk.done) break;
				if (length + chunk.value.length > expected) {
					throw new Error('COGの部分取得サイズが不正です。');
				}
				bytes.set(chunk.value, length);
				length += chunk.value.length;
			}
		} finally {
			await reader.cancel();
		}
		if (length !== expected) throw new Error('COGの部分取得が途中で終了しました。');
		transferred += length;
		blocks.set(offset, bytes);
		return bytes;
	};

	const source = {
		// パーサーが必要としたメタ情報だけを、上限付きのキャッシュから返す。
		fetch: async (slices: { offset: number; length: number; }[]) => {
			const results: ArrayBuffer[] = [];
			for (const { offset: start, length } of slices) {
				if (
					!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(length)
					|| length <= 0 || length > MAX_METADATA_BYTES
					|| !Number.isSafeInteger(start + length)
				) {
					throw new Error('COGのメタ情報サイズが不正です。');
				}
				const firstOffset = Math.floor(start / BLOCK_SIZE) * BLOCK_SIZE;
				await readBlock(firstOffset);
				const end = Math.min(start + length, fileSize!);
				if (end <= start) throw new Error('TIFFの参照先がファイル範囲外です。');
				const data = new Uint8Array(end - start);
				for (let offset = firstOffset; offset < end; offset += BLOCK_SIZE) {
					const block = await readBlock(offset);
					const left = Math.max(start, offset);
					const right = Math.min(end, offset + block.length);
					data.set(block.subarray(left - offset, right - offset), left - start);
				}
				results.push(data.buffer);
			}
			return results;
		}
	};

	try {
		const tiff = await GeoTIFF.fromSource(source, {}, controller.signal);
		const full = await tiff.getImage();
		const keys = full.getGeoKeys();
		if (!full.isTiled || !keys || !(keys.ProjectedCSTypeGeoKey || keys.GeographicTypeGeoKey)) {
			return 'geotiff';
		}
		let bbox: number[];
		try {
			bbox = full.getBoundingBox();
		} catch {
			return 'geotiff';
		}
		if (!bbox.every(Number.isFinite) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) {
			return 'geotiff';
		}
		if (full.getWidth() * full.getHeight() <= MAX_PREVIEW_PIXELS) return 'cog';
		for (let index = 0; index < MAX_IMAGES; index++) {
			if ((await tiff.requestIFD(index)).nextIFDByteOffset === 0) return 'geotiff';
			const overview = await tiff.getImage(index + 1);
			if (
				overview.isTiled && overview.getSamplesPerPixel() === full.getSamplesPerPixel()
				&& !(overview.fileDirectory.NewSubfileType & 4)
				&& overview.getWidth() < full.getWidth() && overview.getHeight() < full.getHeight()
			) return 'cog';
		}
		throw new Error('COGの画像ディレクトリ数が判定上限を超えました。');
	} catch (error) {
		if (error instanceof RangeUnsupportedError) return 'geotiff';
		throw error;
	} finally {
		clearTimeout(timeout);
		controller.abort();
	}
};
