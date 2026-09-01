import { describe, expect, it, vi } from 'vitest';

import { configureIfcWasmPath, IFC_WASM_PATH } from './ifc-wasm-path';

describe('configureIfcWasmPath', () => {
	it('web-ifc に絶対パスとしてWASMの配置先を設定する', async () => {
		const setWasmPath = vi.fn(async () => undefined);
		const setApiWasmPath = vi.fn();

		await configureIfcWasmPath({
			setWasmPath,
			ifcAPI: {
				SetWasmPath: setApiWasmPath
			}
		});

		expect(setWasmPath).toHaveBeenCalledWith(IFC_WASM_PATH);
		expect(setApiWasmPath).toHaveBeenCalledWith(IFC_WASM_PATH, true);
	});
});
