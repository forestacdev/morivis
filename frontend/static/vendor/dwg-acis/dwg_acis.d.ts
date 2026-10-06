/* tslint:disable */
/* eslint-disable */
export function decode_dwg_binary(bytes: Uint8Array): Uint8Array;
export function mesh_dwg_solid(bytes: Uint8Array): Uint8Array;
export function decode_dwg_layers(bytes: Uint8Array, layers_json: string): Uint8Array;
/**
 * Inventory does not parse SAT/SAB or tessellate any solid.
 */
export function inspect_dwg(bytes: Uint8Array): string;
export function decode_dwg(bytes: Uint8Array, max_triangles: number): string;
export function prepare_dwg(bytes: Uint8Array, layers_json: string): PreparedDwg;
export class PreparedDwg {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  drawing(): string;
  next_job(): Uint8Array;
  job_count(): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_prepareddwg_free: (a: number, b: number) => void;
  readonly decode_dwg: (a: number, b: number, c: number) => [number, number, number, number];
  readonly decode_dwg_binary: (a: number, b: number) => [number, number, number, number];
  readonly decode_dwg_layers: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly inspect_dwg: (a: number, b: number) => [number, number, number, number];
  readonly mesh_dwg_solid: (a: number, b: number) => [number, number, number, number];
  readonly prepare_dwg: (a: number, b: number, c: number, d: number) => [number, number, number];
  readonly prepareddwg_drawing: (a: number) => [number, number, number, number];
  readonly prepareddwg_job_count: (a: number) => number;
  readonly prepareddwg_next_job: (a: number) => [number, number, number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
