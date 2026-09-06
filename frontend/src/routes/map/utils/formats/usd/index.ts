import type * as THREE from 'three';
import { zipSync } from 'three/addons/libs/fflate.module.js';

const BINARY_USD_MAGIC = new Uint8Array([0x50, 0x58, 0x52, 0x2d, 0x55, 0x53, 0x44, 0x43]);
const ZIP_FILE_MAGIC = new Uint8Array([0x50, 0x4b]);
const UNSUPPORTED_BINARY_USD_MESSAGE =
	'バイナリ形式のUSD（USDC）は対応していません。USDA または USDZ を使用してください。';

let usdzLoaderModulePromise: Promise<typeof import('three/addons/loaders/USDZLoader.js')> | null =
	null;

const startsWith = (bytes: Uint8Array, magic: Uint8Array) =>
	bytes.length >= magic.length && magic.every((value, index) => bytes[index] === value);

const loadUsdZLoaderModule = async () => {
	if (!usdzLoaderModulePromise) {
		usdzLoaderModulePromise = import('three/addons/loaders/USDZLoader.js');
	}
	return usdzLoaderModulePromise;
};

/** バイナリの USD Crate（USDC）を判定する。 */
export const isBinaryUsdBuffer = (buffer: ArrayBuffer) =>
	startsWith(new Uint8Array(buffer), BINARY_USD_MAGIC);

const isZipArchive = (buffer: ArrayBuffer) => startsWith(new Uint8Array(buffer), ZIP_FILE_MAGIC);

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
	bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const wrapAsciiUsdAsUsdz = (buffer: ArrayBuffer): ArrayBuffer => {
	// USDZLoader は ZIP 内の USDA だけを読むため、単体の ASCII USD も同じ経路にそろえる。
	return toArrayBuffer(zipSync({ 'scene.usda': new Uint8Array(buffer) }));
};

/**
 * USDZ と ASCII USD/USDA を Three.js の USDZLoader で読み込む。
 * Three.js r176 の標準ローダーはバイナリUSD（USDC）を実装していない。
 */
export const parseUsdArrayBuffer = async (buffer: ArrayBuffer): Promise<THREE.Group> => {
	if (isBinaryUsdBuffer(buffer)) {
		throw new Error(UNSUPPORTED_BINARY_USD_MESSAGE);
	}

	const { USDZLoader } = await loadUsdZLoaderModule();
	try {
		return new USDZLoader().parse(isZipArchive(buffer) ? buffer : wrapAsciiUsdAsUsdz(buffer));
	} catch (error) {
		if (error instanceof Error && error.message.includes('Crate files')) {
			throw new Error(UNSUPPORTED_BINARY_USD_MESSAGE);
		}
		throw error;
	}
};

export const parseUsdFile = async (file: File) => parseUsdArrayBuffer(await file.arrayBuffer());
