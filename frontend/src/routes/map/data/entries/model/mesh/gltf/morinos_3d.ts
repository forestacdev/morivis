import { COVER_IMAGE_BASE_PATH, ENTRY_GLTF_PATH } from '$routes/constants';
import type { ModelMeshEntry, MeshStyle } from '$routes/map/data/types/model';

const entry: ModelMeshEntry<MeshStyle> = {
	id: 'morinos_3d',
	type: 'model',
	format: {
		type: 'gltf',
		url: `${ENTRY_GLTF_PATH}/morinos.glb`
	},
	metaData: {
		name: 'morinos 3Dモデル',
		description: '',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 10,
		maxZoom: 22,
		tags: ['3Dモデル', '建物'],
		bounds: [136.919310634999988, 35.5537624600000015, 136.9200659429999973, 35.5544524530000032],
		altitude: 116,
		xyzImageTile: { x: 923099, y: 413380, z: 20 },
		mapImage: `${COVER_IMAGE_BASE_PATH}/morinos_3d.webp`,
		coverImage: `${COVER_IMAGE_BASE_PATH}/morinos_3d.webp`
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'mesh',
		opacity: 0.5,
		wireframe: false,
		color: '#ffffff',
		transform: {
			scale: 0.83,
			lng: 136.919515,
			lat: 35.553991,
			altitude: 121, // 121
			rotationY: 2
		}
	}
};

export default entry;
