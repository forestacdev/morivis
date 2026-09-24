/** RobloxのLZ4はフレームなしのブロック。出力範囲と後方参照を検証してから確保する。 */
export const decodeLz4Block = (input: Uint8Array, expectedSize: number) => {
	const decode = (output?: Uint8Array) => {
		let src = 0, dst = 0;
		const byte = () => {
			if (src >= input.length) throw new Error('LZ4データが途中で終わっています。');
			return input[src++];
		};
		const length = (initial: number) => {
			let result = initial;
			if (initial === 15) {
				let next: number;
				do {
					next = byte();
					result += next;
				} while (next === 255);
			}
			return result;
		};
		while (src < input.length) {
			const token = byte(), literals = length(token >>> 4);
			if (src + literals > input.length || dst + literals > expectedSize) {
				throw new Error('LZ4の展開サイズが不正です。');
			}
			output?.set(input.subarray(src, src + literals), dst);
			src += literals;
			dst += literals;
			if (src === input.length) break;
			const offset = byte() | byte() << 8;
			const match = length(token & 15) + 4;
			if (offset === 0 || offset > dst || dst + match > expectedSize) {
				throw new Error('LZ4の後方参照が不正です。');
			}
			if (output) {
				for (let i = 0; i < match; i++) output[dst + i] = output[dst + i - offset];
			}
			dst += match;
		}
		if (dst !== expectedSize) throw new Error('LZ4の展開サイズが一致しません。');
	};
	decode();
	const output = new Uint8Array(expectedSize);
	decode(output);
	return output;
};

interface ZstdModule {
	Simple: new() => { decompress: (bytes: Uint8Array) => Uint8Array | null; };
	Streaming: new() => { decompress: (bytes: Uint8Array, size: number) => Uint8Array | null; };
	Generic: new() => { contentSize: (bytes: Uint8Array) => number | null; };
}
let zstd: Promise<ZstdModule> | undefined;
export const decompressRobloxChunk = async (input: Uint8Array, expectedSize: number) => {
	if (input[0] !== 0x28 || input[1] !== 0xb5 || input[2] !== 0x2f || input[3] !== 0xfd) {
		return decodeLz4Block(input, expectedSize);
	}
	zstd ??= import('zstd-codec').then(({ ZstdCodec }) =>
		new Promise<ZstdModule>(resolve => {
			ZstdCodec.run(module => resolve(module as ZstdModule));
		})
	);
	const codec = await zstd;
	const size = new codec.Generic().contentSize(input);
	if (size !== null && size >= 0 && size !== expectedSize) {
		throw new Error('Zstandardの展開サイズが一致しません。');
	}
	const result = size !== null && size >= 0
		? new codec.Simple().decompress(input)
		: new codec.Streaming().decompress(input, expectedSize);
	if (!result || result.length !== expectedSize) {
		throw new Error('Zstandardデータを展開できません。');
	}
	return result;
};
