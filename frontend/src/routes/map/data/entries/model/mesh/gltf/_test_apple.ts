import { ENTRY_GLTF_PATH } from '$routes/constants';
import type { ModelMeshEntry, MeshStyle } from '$routes/map/data/types/model';

const entry: ModelMeshEntry<MeshStyle> = {
	id: 'test_apple',
	type: 'model',
	format: {
		type: 'gltf',
		url: `${ENTRY_GLTF_PATH}/apple.glb`
	},
	metaData: {
		name: 'apple 3Dモデル',
		description: '',
		attribution: 'カスタムデータ',
		location: '世界',
		minZoom: 10,
		maxZoom: 22,
		tags: ['3Dモデル', '建物'],
		bounds: [136.919310634999988, 35.5537624600000015, 136.9200659429999973, 35.5544524530000032],
		altitude: 116,
		xyzImageTile: { x: 923099, y: 413380, z: 20 }
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'mesh',
		opacity: 1,
		wireframe: false,
		color: '#ffffff',
		transform: {
			scale: 600,
			lng: 136.919315,
			lat: 35.552991,
			altitude: 0,
			rotationY: 0
		}
	}
};

export default entry;
