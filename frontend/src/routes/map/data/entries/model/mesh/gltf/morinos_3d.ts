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
	properties: {
		...baseEntry.properties,
		detailsById: {
			// TODO: 複数オブジェクト
			'75f72f35-6473-4c21-9ea1-b822c7a9fecb': {
				name: 'V柱',
				description:
					'morinosの象徴的なデザインとなっているV柱。見ようによってはWoodのWにも見えます。',
				url: 'https://www.forest.ac.jp/academy-archives/mori-archi1/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_0961-720x480.jpg'
					}
				]
			},
			'cf76981e-0c24-4bce-8db1-0d249e5aa4a6': {
				name: 'V柱（ヒノキ丸太）',
				description: 'morinosの外観を特徴付ける、ヒノキ丸太を用いたV柱。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi2/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_0929-720x480.jpg'
					}
				]
			},
			'fca29f22-a58d-42b3-9c11-21e6423f12c3': {
				name: '雨樋',
				description: 'morinosに降った雨を処理する雨樋、雨水タンク',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi12/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_5576-720x480.jpg'
					}
				]
			},
			'7f5b5c35-2fc7-489c-b63c-cca0235ee462': {
				name: '土の洞窟',
				description:
					'ちょっと奥まったスペースがあります。かっこいい薪ストーブがあって、なかなかいい雰囲気でしょう。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi18/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_1157%E3%81%AE%E3%82%B3%E3%83%94%E3%83%BC-720x441.jpg'
					}
				]
			},
			// TODO: 複数オブジェクト
			'341e0e34-68a2-40b7-91d9-60d0b46d1e63': {
				name: '格子',
				description:
					'morinosの収納庫は普通の壁ではなく「木の格子」。向こう側が見えて、光と空気が行き来できるようになっています。あと、中が見えているのでいつも綺麗に片付けながら運用する効果も狙っているのです。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi14/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_1153%E3%81%AE%E3%82%B3%E3%83%94%E3%83%BC-720x480.jpg'
					}
				]
			},
			'9935c753-0abf-48a1-a5c0-6f502666428a': {
				name: '床材',
				description:
					'このデッキは岐阜県産スギ材で構成されていますが、製材したままの杉を土足外部デッキに使用すると材質が柔らかいため傷がつきやすかったり、表面が擦り減ってしまいます。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi5/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_5554-720x480.jpg'
					},
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_0987-720x480.jpg'
					}
				]
			}
		}
	},
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
