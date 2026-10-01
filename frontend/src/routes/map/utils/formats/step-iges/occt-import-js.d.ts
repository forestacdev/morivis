declare module 'occt-import-js' {
	const initialize: (options?: {
		wasmBinary?: Uint8Array;
		print?: (text: string) => void;
		printErr?: (text: string) => void;
	}) => Promise<import('./types').CadImporter>;
	export default initialize;
}
