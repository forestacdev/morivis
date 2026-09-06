import * as THREE from 'three';
import { zipSync } from 'three/addons/libs/fflate.module.js';
import { describe, expect, it } from 'vitest';

import { isBinaryUsdBuffer, parseUsdArrayBuffer } from '.';

const TEXT_ENCODER = new TextEncoder();
const SYNTHETIC_USDA = `#usda 1.0
(
	defaultPrim = "Root"
)

def Xform "Root"
{
	def Mesh "Triangle"
	{
		int[] faceVertexCounts = [3]
		int[] faceVertexIndices = [0, 1, 2]
		point3f[] points = [(0, 0, 0), (2, 0, 0), (0, 3, 0)]
	}
}`;

const toArrayBuffer = (text: string) => {
	const bytes = TEXT_ENCODER.encode(text);
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

const bytesToArrayBuffer = (bytes: Uint8Array) =>
	bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

describe('USD parser', () => {
	it('ASCII USDA をUSDZLoader経由でメッシュへ変換できる', async () => {
		const object = await parseUsdArrayBuffer(toArrayBuffer(SYNTHETIC_USDA));
		const box = new THREE.Box3().setFromObject(object);

		expect(box.min.toArray()).toEqual([0, 0, 0]);
		expect(box.max.toArray()).toEqual([2, 3, 0]);
	});

	it('USDZアーカイブをそのまま読み込める', async () => {
		const archive = bytesToArrayBuffer(
			zipSync({ 'scene.usda': TEXT_ENCODER.encode(SYNTHETIC_USDA) })
		);
		const object = await parseUsdArrayBuffer(archive);

		expect(new THREE.Box3().setFromObject(object).max.toArray()).toEqual([2, 3, 0]);
	});

	it('バイナリ USD Crate（USDC）は明示的に拒否する', async () => {
		const binaryUsd = toArrayBuffer('PXR-USDC mock binary data');

		expect(isBinaryUsdBuffer(binaryUsd)).toBe(true);
		await expect(parseUsdArrayBuffer(binaryUsd)).rejects.toThrow(
			'バイナリ形式のUSD（USDC）は対応していません'
		);
	});
});
