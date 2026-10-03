import { describe, expect, it } from 'vitest';
import { readRecords } from './iso8211';

// 架空の単一フィールド。大きなrecord length=0とbinary内のFTを独立に検査する。
const record = (length: number, ddr: boolean): Uint8Array => {
	const data = new Uint8Array(length).fill(30);
	const leader = `${String(length + 41 < 100000 ? length + 41 : 0).padStart(5, '0')}${
		ddr ? '3LE1 09' : ' D     '
	}00041   6604`;
	const header = new TextEncoder().encode(
		`${leader}TEST${String(length).padStart(6, '0')}000000\x1e`
	);
	const bytes = new Uint8Array(header.length + length);
	bytes.set(header);
	bytes.set(data, header.length);
	return bytes;
};
describe('ISO 8211 framing', () => {
	it('長いレコードをdirectoryの長さで区切り、内部のFTを終端と誤認しない', () => {
		const ddr = record(1, true);
		const data = record(100000, false);
		const bytes = new Uint8Array(ddr.length + data.length);
		bytes.set(ddr);
		bytes.set(data, ddr.length);
		const lengths: number[] = [];
		readRecords(bytes, fields => lengths.push(fields.get('TEST')![0].length));
		expect(lengths).toEqual([1, 100000]);
	});
	it('directoryの範囲外・空欄の長さ・途中切れを拒否する', () => {
		const bytes = record(1, true);
		bytes[34] = 57;
		expect(() => readRecords(bytes, () => {})).toThrow('ISO 8211');
		const blank = record(1, true);
		blank[0] = 32;
		expect(() => readRecords(blank, () => {})).toThrow('ISO 8211');
		expect(() => readRecords(record(1, true).subarray(0, -1), () => {})).toThrow('ISO 8211');
	});
});
