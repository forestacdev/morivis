import { BaseDecoder } from 'geotiff';

interface ZstdModule {
	Simple: new() => { decompress: (bytes: Uint8Array) => Uint8Array | null; };
	Streaming: new() => { decompress: (bytes: Uint8Array) => Uint8Array | null; };
	Generic: new() => { contentSize: (bytes: Uint8Array) => number | null; };
}

let codecPromise: Promise<ZstdModule> | undefined;

const getCodec = () => {
	codecPromise ??= import('zstd-codec').then(({ ZstdCodec }) =>
		new Promise<ZstdModule>(resolve => {
			ZstdCodec.run(codec => resolve(codec as ZstdModule));
		})
	);
	return codecPromise;
};

// Predictor 2/3の復元はBaseDecoder.decodeに任せる。
export class ZstdDecoder extends BaseDecoder {
	decodeBlock = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
		const codec = await getCodec();
		const input = new Uint8Array(buffer);
		const size = new codec.Generic().contentSize(input);
		const decoded = size !== null && size > 0
			? new codec.Simple().decompress(input)
			: new codec.Streaming().decompress(input);
		if (!decoded || decoded.byteLength === 0) {
			throw new Error('GeoTIFFのZSTD圧縮ブロックを展開できません。');
		}
		// Streamingの返却値は大きなバッファの一部を指す場合がある。
		return decoded.slice().buffer;
	};
}
