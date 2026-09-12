import type { FeatureCollection } from '$routes/map/types/geojson';
import { Box3, Group, Vector3 } from 'three';
import { createDxfMesh, disposeDxfModel } from '../dxf/mesh';

/** Share CAD face triangulation, while keeping CEDXM member IDs and attributes per mesh. */
export const createCedxmModel = (data: FeatureCollection) => {
	const model = new Group();
	model.name = 'CEDXM';
	try {
		for (const feature of data.features) {
			const mesh = createDxfMesh({ type: 'FeatureCollection', features: [feature] });
			const [x, y, z] = mesh.userData.sourceOrigin as number[];
			mesh.position.set(x, z, -y);
			mesh.name = `${feature.properties.type} ${feature.properties.source_id || feature.id}`;
			mesh.userData = { ...mesh.userData, sourceFormat: 'CEDXM', ...feature.properties };
			model.add(mesh);
		}
		const bounds = new Box3().setFromObject(model);
		if (bounds.isEmpty()) throw new Error('CEDXMの3D部材がありません');
		const origin = bounds.getCenter(new Vector3());
		origin.y = bounds.min.y;
		for (const child of model.children) child.position.sub(origin);
		model.userData = {
			sourceFormat: 'CEDXM',
			coordinateUnit: 'm',
			sourceOrigin: [origin.x, -origin.z, origin.y]
		};
		return model;
	} catch (error) {
		disposeDxfModel(model);
		throw error;
	}
};
