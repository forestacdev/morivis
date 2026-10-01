// DGNLib/GDALのlinkage構造を参照。THIRD_PARTY_NOTICES.mdを参照。
import type { FeatureProp } from '$routes/map/types/properties';
import { hexBytes, requireBytes } from './binary';

export const readAttributes = (raw: Uint8Array) => {
	const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
	const links: Record<string, { size: number; raw: string[]; }[]> = {};
	const properties: FeatureProp = {};
	let fillColor: number | undefined;
	let deltaOffset: number | undefined;
	let deltaEnd = 0;
	// Type 0x51a9は通常のlinkage内部に入るsub-UOR補正。座標へ加算する。
	for (let i = 0; i + 6 <= raw.length; i += 2) {
		if (view.getUint16(i, true) !== 0x51a9) continue;
		const length = view.getUint16(i + 2, true) * 2;
		if (length) {
			deltaOffset = i + 6;
			deltaEnd = Math.min(raw.length, deltaOffset + length);
		}
		break;
	}
	let offset = 0;
	while (offset + 4 <= raw.length) {
		const dmrs = raw[offset] === 0 && (raw[offset + 1] === 0 || raw[offset + 1] === 0x80);
		const length = dmrs ? 8 : raw[offset + 1] & 0x10 ? (raw[offset] + 1) * 2 : 0;
		if (!length) break;
		if (length <= 4) throw new Error('DGNの属性リンク長が不正です');
		requireBytes(view, offset, length);
		const type = dmrs ? 0 : view.getUint16(offset + 2, true);
		const words: string[] = [];
		for (let i = offset; i < offset + length; i += 2) {
			words.push(`0x${view.getUint16(i, true).toString(16).padStart(4, '0')}`);
		}
		(links[type] ??= []).push({ size: length, raw: words });
		if (type === 0x0041 && length >= 10) fillColor = raw[offset + 8];
		let entity = 0, mslink = 0;
		if (dmrs) {
			entity = view.getUint16(offset + 2, true);
			mslink = view.getUint16(offset + 4, true) + raw[offset + 6] * 65536;
		} else if (length === 16 && type !== 0x0041) {
			entity = view.getUint16(offset + 6, true);
			mslink = view.getInt32(offset + 8, true);
		}
		if ((entity || mslink) && properties.EntityNum === undefined) {
			properties.EntityNum = entity;
			properties.MSLink = mslink;
		}
		offset += length;
	}
	if (Object.keys(links).length) properties.ULink = JSON.stringify(links);
	if (offset < raw.length) properties.UnparsedAttributes = hexBytes(raw.subarray(offset));
	const delta = (index: number): [number, number] => {
		const start = (deltaOffset ?? 0) + index * 4;
		return deltaOffset !== undefined && start + 4 <= deltaEnd
			? [view.getInt16(start, true) / 32767, view.getInt16(start + 2, true) / 32767]
			: [0, 0];
	};
	return { properties, fillColor, delta };
};
