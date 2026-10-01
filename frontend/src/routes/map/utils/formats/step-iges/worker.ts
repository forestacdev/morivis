import initialize from 'occt-import-js';
import wasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createCadModel, disposeCadModel, readCadFile } from '.';
import type { CadUpAxis } from './types';

export interface CadRequest {
	file: File;
	upAxis: CadUpAxis;
}
export type CadResponse = { glb: ArrayBuffer; } | { error: string; };

self.onmessage = async ({ data }: MessageEvent<CadRequest>) => {
	let model: ReturnType<typeof createCadModel> | undefined;
	try {
		const response = await fetch(wasmUrl);
		if (!response.ok) {
			throw new Error(`CADの読み込みモジュールを取得できません: ${response.status}`);
		}
		const importer = await initialize({
			wasmBinary: new Uint8Array(await response.arrayBuffer())
		});
		const result = readCadFile(
			importer,
			new Uint8Array(await data.file.arrayBuffer()),
			data.file.name
		);
		model = createCadModel(result, data.upAxis);
		const glb = await new GLTFExporter().parseAsync(model, { binary: true });
		if (!(glb instanceof ArrayBuffer)) {
			throw new Error('STEP／IGESを3Dモデルに変換できませんでした');
		}
		(self as unknown as Worker).postMessage({ glb } satisfies CadResponse, [glb]);
	} catch (error) {
		postMessage(
			{ error: error instanceof Error ? error.message : String(error) } satisfies CadResponse
		);
	} finally {
		if (model) disposeCadModel(model);
	}
};
