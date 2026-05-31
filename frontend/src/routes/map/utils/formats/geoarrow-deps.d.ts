declare module 'lz4js';

declare module 'zstd-codec' {
	export const ZstdCodec: {
		run: (callback: (codec: unknown) => void) => void;
	};
}
