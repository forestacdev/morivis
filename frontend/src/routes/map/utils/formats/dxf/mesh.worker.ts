import type { FeatureCollection } from '$routes/map/types/geojson';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { CadGeoreference } from './georeference';
import type { IndexedCadMesh } from './indexed-mesh';
import { createDxfModel, disposeDxfModel } from './mesh';
import { placeCadModel } from './model-placement';

self.onmessage = async (
	{ data }: MessageEvent<
		{
			geojson: FeatureCollection;
			indexedMeshes: IndexedCadMesh[];
			georeference?: CadGeoreference;
		}
	>
) => {
	let model: ReturnType<typeof createDxfModel> | undefined;
	try {
		model = createDxfModel(data.geojson, data.indexedMeshes);
		const placement = data.georeference
			? await placeCadModel(model, data.georeference)
			: undefined;
		const glb = await new GLTFExporter().parseAsync(model, { binary: true });
		if (!(glb instanceof ArrayBuffer)) throw new Error('DXFのGLB変換に失敗しました');
		(self as unknown as Worker).postMessage({ glb, placement }, [glb]);
	} catch (error) {
		postMessage({ error: error instanceof Error ? error.message : String(error) });
	} finally {
		if (model) disposeDxfModel(model);
	}
};
