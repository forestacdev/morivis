declare module '@cornerstonejs/codec-openjpeg/decodewasmjs' {
	export interface J2KDecoder {
		getEncodedBuffer(size: number): Uint8Array;
		decode(): void;
		getDecodedBuffer(): Uint8Array;
		getFrameInfo(): {
			width: number;
			height: number;
			bitsPerSample: number;
			componentCount: number;
			isSigned: boolean;
		};
		delete(): void;
	}
	export interface OpenJpeg {
		J2KDecoder: new() => J2KDecoder;
	}
	const init: (
		options: {
			locateFile?: (name: string) => string;
			wasmBinary?: Uint8Array;
			print?: (message: string) => void;
			printErr?: (message: string) => void;
		}
	) => Promise<OpenJpeg>;
	export default init;
}
