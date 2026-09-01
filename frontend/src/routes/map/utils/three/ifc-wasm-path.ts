const basePath = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export const IFC_WASM_PATH = `${basePath}web-ifc/`;

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
