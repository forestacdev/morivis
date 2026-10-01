import { readFileSync } from 'node:fs';
import type { TabBytes } from '../parser';

/** 架空fixtureの属性を共用し、図形レコードだけを小さな既知の値から作る。 */
export const syntheticTab = (type = 2): TabBytes => {
	const load = (ext: string) =>
		new Uint8Array(readFileSync(new URL(`./test-point.${ext}`, import.meta.url)));
	const tab = load('tab'), attributes = load('dat');
	const map = new Uint8Array(2560), id = new Uint8Array(4);
	map.set(load('map').subarray(0, 512));
	const v = new DataView(map.buffer);
	v.setUint16(0x104, 800, true);
	v.setUint16(0x106, 512, true);
	map[0x161] = 1;
	for (const offset of [0x170, 0x178]) v.setFloat64(offset, 1, true);
	for (const offset of [0x180, 0x188]) v.setFloat64(offset, 0, true);
	for (const offset of [0x130, 0x134, 0x138]) v.setInt32(offset, 0, true);
	new DataView(id.buffer).setUint32(0, 1044, true);
	v.setUint16(1024, 2, true);
	const compressed = type % 3 === 1, kind = compressed ? type + 1 : type;
	const origin = compressed ? [100, 200] : [0, 0];
	v.setInt32(1028, origin[0], true);
	v.setInt32(1032, origin[1], true);
	let pos = 1044;
	const u8 = (n: number) => {
		v.setUint8(pos, n);
		pos++;
	};
	const i16 = (n: number) => {
		v.setInt16(pos, n, true);
		pos += 2;
	};
	const i32 = (n: number) => {
		v.setInt32(pos, n, true);
		pos += 4;
	};
	const point = (x: number, y: number) => {
		if (compressed) {
			i16(x - origin[0]);
			i16(y - origin[1]);
		} else {
			i32(x);
			i32(y);
		}
	};
	u8(type);
	i32(1);
	const coordinate = (write: () => void) => {
		const saved = pos;
		pos = 1544;
		write();
		v.setUint16(1536, 3, true);
		v.setUint16(1538, pos - 1544, true);
		pos = saved;
	};
	const labelOriginMbr = () => {
		if (compressed) {
			point(1, 2);
			i32(origin[0]);
			i32(origin[1]);
			point(1, 2);
			point(4, 5);
		} else {
			point(1, 2);
			point(1, 2);
			point(4, 5);
		}
	};
	if ([2, 0x29, 0x2c].includes(kind)) {
		if (kind === 0x29) pos += 12;
		if (kind === 0x2c) pos += 2;
		point(1, 2);
		u8(0);
		if (kind === 0x2c) u8(0);
	} else if (kind === 5) {
		point(1, 2);
		point(4, 5);
		u8(0);
	} else if ([0x35, 0x44].includes(kind)) {
		i32(1544);
		i32(2);
		pos += 17 + (kind === 0x44 ? 33 : 0);
		labelOriginMbr();
		coordinate(() => {
			point(1, 2);
			point(4, 5);
		});
	} else if ([0x38, 0x47].includes(kind)) {
		// region + line + multipointを含む複合図形。
		const v800 = kind === 0x47, pointSize = compressed ? 4 : 8;
		const storedSection = (v800 ? 12 : 10) + pointSize * 2;
		i32(1544);
		i32(2);
		i32(storedSection + 4 * pointSize + 2);
		i32(storedSection + 2 * pointSize + 2);
		if (v800) {
			i32(1);
			i32(1);
			u8(4);
		} else {
			i16(1);
			i16(1);
		}
		pos += 20;
		if (compressed) {
			i32(origin[0]);
			i32(origin[1]);
		}
		point(1, 2);
		point(4, 5);
		coordinate(() => {
			for (const points of [[[1, 2], [3, 2], [3, 4], [1, 2]], [[1, 2], [4, 5]]]) {
				if (v800) i32(1);
				point(1, 2);
				point(1, 2);
				point(4, 5);
				i32(points.length);
				if (v800) i32(0);
				else i16(0);
				point(1, 2);
				point(4, 5);
				i32(28);
				points.forEach(([x, y]) => point(x, y));
			}
			point(1, 2);
			point(1, 2);
			point(4, 5);
			point(1, 2);
			point(4, 5);
		});
	} else if ([0x14, 0x17, 0x1a].includes(kind)) {
		if (kind === 0x17) {
			if (compressed) {
				i16(2);
				i16(2);
			} else {
				i32(2);
				i32(2);
			}
		}
		point(1, 2);
		point(5, 6);
		u8(0);
		u8(0);
	} else if (kind === 0x0b) {
		i16(0);
		i16(900);
		point(1, 2);
		point(5, 6);
		point(3, 4);
		point(5, 6);
		u8(0);
	} else if ([0x2f, 0x32, 0x3e, 0x41].includes(kind)) {
		const v800 = kind >= 0x3e, region = [0x2f, 0x3e].includes(kind), count = region ? 4 : 2;
		const pointSize = compressed ? 4 : 8;
		i32(1544);
		i32((v800 ? 12 : 10) + pointSize * (2 + count));
		if (v800) {
			i32(1);
			pos += 33;
		} else i16(1);
		labelOriginMbr();
		u8(0);
		if (region) u8(0);
		coordinate(() => {
			i32(count);
			if (v800) i32(0);
			else i16(0);
			point(1, 2);
			point(4, 5);
			i32(28);
			(region ? [[1, 2], [4, 2], [4, 5], [1, 2]] : [[1, 2], [4, 5]]).forEach(([x, y]) =>
				point(x, y)
			);
		});
	}
	v.setUint16(1026, map[type] & 127, true);
	return { tab, attributes, map, id };
};

export const syntheticDbf = (): TabBytes => {
	const fixture = syntheticTab();
	fixture.tab = new TextEncoder().encode(
		'!table\n!version 300\n!charset WindowsLatin1\nDefinition Table\n Type DBF\n Fields 4\n name Char(12);\n amount Decimal(8,2);\n active Logical;\n day Date;\n'
	);
	const sizes = [12, 8, 1, 8],
		header = 33 + sizes.length * 32,
		row = 1 + sizes.reduce((a, b) => a + b, 0);
	const bytes = new Uint8Array(header + row), v = new DataView(bytes.buffer);
	bytes[0] = 3;
	v.setUint32(4, 1, true);
	v.setUint16(8, header, true);
	v.setUint16(10, row, true);
	sizes.forEach((size, i) => {
		bytes[32 + i * 32 + 16] = size;
		bytes[32 + i * 32 + 11] = 'CNLD'[i].charCodeAt(0);
	});
	bytes[header - 1] = 13;
	bytes.set(
		new TextEncoder().encode(' ' + 'test-dbf'.padEnd(12) + '  -12.50' + 'T' + '20010102'),
		header
	);
	fixture.attributes = bytes;
	return fixture;
};

export const syntheticAttribute = (type: string, value: Uint8Array, native = true): TabBytes => {
	const fixture = syntheticTab();
	fixture.tab = new TextEncoder().encode(
		`!table\n!version 900\n!charset WindowsLatin1\nDefinition Table\n Type ${
			native ? 'NATIVE' : 'DBF'
		}\n Fields 1\n value ${type};\n`
	);
	const bytes = new Uint8Array(65 + 1 + value.length), v = new DataView(bytes.buffer);
	bytes[0] = 3;
	v.setUint32(4, 1, true);
	v.setUint16(8, 65, true);
	v.setUint16(10, 1 + value.length, true);
	bytes[48] = value.length;
	bytes[64] = 13;
	bytes[65] = 32;
	bytes.set(value, 66);
	fixture.attributes = bytes;
	return fixture;
};
