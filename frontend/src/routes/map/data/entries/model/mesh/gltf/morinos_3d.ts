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
			},
			'd2258ec0-612e-4ffc-ac3a-0c14017979c0': {
				name: '樹皮付き方立',
				description:
					'方立（ほうだて）とは、ガラスや開口部の横に取り付けられる垂直の桟のこと。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi25/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_0968-720x480.jpg'
					},
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_5569-720x480.jpg'
					}
				]
			},
			'77164639-4feb-49d5-b86e-af26be2296c0': {
				name: 'ガラスコーナー',
				description:
					'morinosの建物コーナー部はガラスのみで、柱や押さえ縁などの木材がありません。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi4/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/%E3%82%B3%E3%83%BC%E3%83%8A%E3%83%BC.jpg'
					}
				]
			},
			'6b32906e-178c-4979-88c3-00c39cd9242d': {
				name: '照明',
				description:
					'内部に照明や火災報知器、防犯センサーなど機能的な設備が仕込まれています。スリット内の色は、単純な黒ではなく、照明器具の黒に合わせて調色して目立たないようにそろえています。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi9/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_1397-720x1080.jpg'
					}
				]
			},
			'579911d9-7392-4416-9222-2d165f561c90': {
				name: '登り梁',
				description: 'morinosの大きな無柱内部空間を支える大きな登り梁。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi6/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/03/IMG_0946-720x480.jpg'
					}
				]
			},
			'9d4680c3-95e2-4824-8924-468ad9649879': {
				name: '大きな豆型テーブル',
				description:
					'この【ミズナラ】の豆型テーブルは、morinosのためにデザインした特別なテーブルです。主にスタッフさんが仕事をするためのもので、持ち上げると動かすことが出来ます。だから、この位置にないことも。形は、ふたつの円がくっつこうとしているような、曲線を描いた天板です。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi59/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2021/04/IMG_1532-scaled.jpeg'
					},
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/04/IMG_4482.jpg'
					}
				]
			},
			'8046eb1e-4bbd-45b5-b6b5-5763afbb4ce9': {
				name: '土壁',
				description:
					'東のメインエントランスを入ると、真っ先に目に飛び込んでくる十二単のような色鮮やかな左官壁。自然の色が織りなす美しい仕上がりです。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi45/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/05/IMG_1895-scaled.jpg'
					},
					{
						type: 'youtube',
						id: 'XaWI1wtRbuY'
					}
				]
			},
			'0fcfa9bc-972a-499b-badb-21a1de3b003e': {
				name: 'ソファ',
				description:
					'ソファで足を伸ばして仕事をしてもいいですね。スタッフもここでお弁当を食べてもいいかもしれません。来館者と一緒にすごせる憩いの場です。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi30/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/04/IMG_4718-2-720x540.jpg'
					},
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/04/IMG_4730-2-720x543.jpg'
					}
				]
			},
			'f267bea0-4dfb-48b6-877c-7e6ed8768030': {
				name: '南向きのカウンター',
				description:
					'外であそぶ子どもを見ながらコーヒーを飲める、PCを持ってくれば仕事もできる、誰でも使えるヒノキの一枚板カウンターです。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi59/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2021/03/20200514_0061-scaled.jpg'
					}
				]
			},
			'08e9f1cd-a1f5-4758-a7c0-179630a97bdf': {
				name: '南向きのカウンター',
				description:
					'外であそぶ子どもを見ながらコーヒーを飲める、PCを持ってくれば仕事もできる、誰でも使えるヒノキの一枚板カウンターです。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi59/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/04/IMG_1691-2-720x480.jpg'
					}
				]
			},
			'70e569ef-c7e1-4568-8799-d15e6b7d666f': {
				name: 'みみ付きデスク',
				description:
					'みみ付きというのは、四辺のうち一つを、皮を剥いた木の表面のままにしているということです。使うときは体に触れる部分なので、直線でなく木そのままの凸凹を感じてもらうことができます。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi59/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2020/04/IMG_1721-2.jpg'
					},
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2021/03/IMG_1514-720x540.jpeg'
					}
				]
			},
			'fdf4735c-39ef-4bcd-8b7e-44c86d8222f1': {
				name: '工作椅子',
				description:
					'工作椅子は、横に倒すと低く座ることができて、小さなお子さんでも座ってもらえます。',
				url: 'https://www.forest.ac.jp/academy-archives/morinos-archi59/',
				medias: [
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2021/04/IMG_1486-720x540.jpeg'
					},
					{
						type: 'image',
						url: 'https://www.forest.ac.jp/wp-content/uploads/2021/04/IMG_1504D.jpg'
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
