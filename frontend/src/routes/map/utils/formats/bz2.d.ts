declare module 'bz2' {
	const bz2: {
		decompress: (data: Uint8Array, crc?: boolean) => Uint8Array;
	};

	export default bz2;
}
