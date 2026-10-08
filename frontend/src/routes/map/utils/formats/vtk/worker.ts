import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { parseVtk, summarizeVtk } from '.';
import { formatVtk } from './definition';
import { createVtkModel, disposeVtkModel } from './model';
import { checkVtkFileSize } from './numeric';
import type { VtkRenderOptions, VtkSummary } from './types';

export type VtkRequest = { file: File; options?: VtkRenderOptions; };
export type VtkResponse = { summary: VtkSummary; } | { glb: ArrayBuffer; } | { error: string; };

self.onmessage = async ({ data }: MessageEvent<VtkRequest>) => {
	let model: ReturnType<typeof createVtkModel> | undefined;
	try {
		checkVtkFileSize(data.file.size);
		const parsed = parseVtk(await data.file.arrayBuffer());
		if (!data.options) {
			postMessage({ summary: summarizeVtk(parsed) } satisfies VtkResponse);
			return;
		}
		model = createVtkModel(parsed, data.options);
		const glb = await new GLTFExporter().parseAsync(model, { binary: true });
		if (!(glb instanceof ArrayBuffer) || glb.byteLength > formatVtk.limits.maxOutputBytes) {
			throw new Error('VTK: 変換後のモデルが192 MiBを超えています。データを分割してください');
		}
		(self as unknown as Worker).postMessage({ glb } satisfies VtkResponse, [glb]);
	} catch (error) {
		postMessage(
			{ error: error instanceof Error ? error.message : String(error) } satisfies VtkResponse
		);
	} finally {
		if (model) disposeVtkModel(model);
	}
};
