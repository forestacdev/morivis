declare module 'web-e57-internal/e57_bg.js' {
	export const __wbg_set_wasm: (exports: WebAssembly.Exports) => void;
	export const __wbindgen_string_new: (pointer: number, length: number) => number;
	export const __wbindgen_throw: (pointer: number, length: number) => never;
	export const convertE57: (bytes: Uint8Array, format: string) => string;
}
declare module 'web-e57-internal/e57_bg.wasm?url' {
	const url: string;
	export default url;
}
