import { writeFileSync } from 'node:fs';

// 65×49、透明背景と赤・青・緑の四角形。フレーム間隔は200・500・300 ms。
// clear codeを各画素の前に置くことで、辞書サイズが変化しない最小のLZWを生成する。
const width = 65;
const height = 49;
const word = value => [value & 255, value >> 8];
const bytes = [
	...Buffer.from('GIF89a'), ...word(width), ...word(height), 0x81, 0, 0,
	0, 0, 0, 255, 0, 0, 0, 0, 255, 0, 255, 0,
	0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0
];
for (const [index, delay] of [20, 50, 30].entries()) {
	bytes.push(0x21, 0xf9, 4, 9, ...word(delay), 0, 0);
	bytes.push(0x2c, 0, 0, 0, 0, ...word(width), ...word(height), 0, 2);
	const codes = [];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			codes.push(4, x >= 16 && x < 48 && y >= 12 && y < 36 ? index + 1 : 0);
		}
	}
	codes.push(5);
	const packed = [];
	let bits = 0;
	let count = 0;
	for (const code of codes) {
		bits |= code << count;
		count += 3;
		if (count >= 8) {
			packed.push(bits & 255);
			bits >>= 8;
			count -= 8;
		}
	}
	if (count) packed.push(bits);
	for (let offset = 0; offset < packed.length; offset += 255) {
		const block = packed.slice(offset, offset + 255);
		bytes.push(block.length, ...block);
	}
	bytes.push(0);
}
bytes.push(0x3b);
writeFileSync(new URL('./test-animation.gif', import.meta.url), new Uint8Array(bytes));
