import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';

// Worker の BASE_URL は './' になるため、Worker URL からアプリの base path を復元する。
export const IFC_WASM_PATH = resolveStaticAssetPath('/web-ifc/');

interface IfcManagerWithWasmPath {
	setWasmPath: (path: string) => Promise<void>;
	ifcAPI: {
		SetWasmPath: (path: string, absolute?: boolean) => void;
	};
}

export const configureIfcWasmPath = async (manager: IfcManagerWithWasmPath) => {
	await manager.setWasmPath(IFC_WASM_PATH);
	manager.ifcAPI.SetWasmPath(IFC_WASM_PATH, true);
};
