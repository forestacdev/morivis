import { COVER_IMAGE_BASE_PATH, ENTRY_GLTF_PATH } from '$routes/constants';
import { createMeshModelEntry } from '$routes/map/data/entries/_factories/model';

const baseEntry = createMeshModelEntry({
	id: 'morinos_3d',
	name: 'morinos 3Dモデル',
	url: `${ENTRY_GLTF_PATH}/morinos_fix2.glb`,
	attribution: '森林文化アカデミー',
	location: '森林文化アカデミー',
	bounds: [136.919310634999988, 35.5537624600000015, 136.9200659429999973, 35.5544524530000032],
	transform: {
		scale: 0.83,
		lng: 136.919515,
		lat: 35.553991,
		altitude: 116,
		rotationY: 358
	},
	opacity: 0.7,
	xyzImageTile: 'zoom_15'
});

const entry = {
	...baseEntry,
	metaData: {
		...baseEntry.metaData,
		description: '',
		minZoom: 10,
		maxZoom: 22,
		xyzImageTile: { x: 923099, y: 413380, z: 20 },
		mapImage: `${COVER_IMAGE_BASE_PATH}/morinos_3d.webp`,
		coverImage: `${COVER_IMAGE_BASE_PATH}/morinos.webp`
	}
};

export default entry;
