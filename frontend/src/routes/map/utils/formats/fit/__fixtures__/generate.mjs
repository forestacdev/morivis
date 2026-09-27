// 架空の座標・時刻だけで作る最小FIT。デコーダーに依存せずwire形式とCRCを固定する。
// 再生成: node frontend/src/routes/map/utils/formats/fit/__fixtures__/generate.mjs
import { writeFileSync } from 'node:fs';

const crc = bytes => {
	let value = 0;
	for (const byte of bytes) {
		value ^= byte;
		for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (value >>> 1) ^ 0xa001 : value >>> 1;
	}
	return value;
};
const uint16 = value => [value & 255, (value >>> 8) & 255];
const uint32 = value => [...uint16(value), ...uint16(value >>> 16)];
const finish = (name, body, headerSize = 14) => {
	const header = [headerSize, 0x20, ...uint16(2100), ...uint32(body.length), 46, 70, 73, 84];
	if (headerSize === 14) header.push(...uint16(crc(header)));
	const content = [...header, ...body];
	writeFileSync(new URL(name, import.meta.url), new Uint8Array([...content, ...uint16(crc(content))]));
};
const definition = (local, global, fields, bigEndian = false, developer = false) => [
	0x40 | local | (developer ? 0x20 : 0), 0, bigEndian ? 1 : 0,
	...(bigEndian ? uint16(global).reverse() : uint16(global)), fields.length,
	...fields.flat(), ...(developer ? [1, 0, 2, 0] : [])
];
const write = (local, fields, values, bigEndian = false) => [local, ...fields.flatMap((field, index) => {
	const value = values[index];
	if (Array.isArray(value)) return value;
	const bytes = field[1] === 4 ? uint32(value) : field[1] === 2 ? uint16(value) : [value];
	return bigEndian ? bytes.reverse() : bytes;
})];
const semicircles = degrees => Math.round(degrees * 2 ** 31 / 180);
const time = 1_000_000_000;
const fields = [[253, 4, 134], [0, 4, 133], [1, 4, 133], [2, 2, 132], [3, 1, 2], [4, 1, 2], [5, 4, 134], [6, 2, 132], [7, 2, 132], [13, 1, 1], [73, 4, 134], [78, 4, 134]];
const record = (seconds, lat = 1.25, lon = 2.5) => write(0, fields, [
	time + seconds, semicircles(lat), semicircles(lon), 2550, 120, 60, 1250, 1500, 100, 20, 2250, 2625
]);
const eventFields = [[253, 4, 134], [0, 1, 0], [1, 1, 0]];
finish('test-track.fit', [
	...definition(0, 20, fields), ...record(0), ...record(1, 1.2501, 2.5001),
	...definition(1, 21, eventFields), ...write(1, eventFields, [time + 1, 0, 1]),
	...record(10, 1.2502, 2.5002), ...record(11, 1.2503, 2.5003)
]);
finish('test-gap.fit', [
	...definition(0, 20, fields), ...record(0), ...record(1),
	...write(0, fields, [time + 2, 0x7fffffff, 0x7fffffff, 0xffff, 0xff, 0xff, 0xffffffff, 0xffff, 0xffff, 0x7f, 0xffffffff, 0xffffffff]),
	...record(3), ...record(4)
]);
finish('test-single.fit', [...definition(0, 20, fields), ...record(0, 0, 0)], 12);
finish('test-no-gps.fit', [...definition(0, 20, [[3, 1, 2]]), 0, 120]);
const waypointFields = [[253, 4, 134], [2, 4, 133], [3, 4, 133], [4, 4, 134], [5, 1, 0], [6, 10, 7]];
finish('test-course.fit', [...definition(0, 32, waypointFields), ...write(0, waypointFields, [
	time, semicircles(1.25), semicircles(2.5), 5000, 6, [...new TextEncoder().encode('test-turn'), 0]
])]);
// Big endian、未定義developer field、圧縮timestampの巻き戻り（31→0）を同時に通す。
const compactFields = [[253, 4, 134], [0, 4, 133], [1, 4, 133]];
finish('test-compressed.fit', [
	...definition(0, 20, compactFields, true, true),
	...write(0, compactFields, [time + 31, semicircles(-1.25), semicircles(-2.5)], true), 1, 2,
	0x80, ...write(0, compactFields.slice(1), [semicircles(-1.5), semicircles(-2.75)], true).slice(1), 3, 4
]);
