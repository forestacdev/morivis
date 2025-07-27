import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';
import { LEGEND_DATA_PATH } from '$routes/constants';

const IMG = LEGEND_DATA_PATH + '/landslide';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'landslide',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www.j-shis.bosai.go.jp/map/xyz/landslide/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '地すべり地形分布',
		description: `防災科学技術研究所地震ハザードステーション（J-SHIS）が提供する地すべり地形分布図日本全国版を表示します。地すべり地形分布図は、地すべり変動によって形成された地形的痕跡である「地すべり地形」の外形と基本構造（滑落崖・移動体）を空中写真判読によりマッピングし、1:50,000地形図にその分布を示した図面です。（引用：地理院タイル）`,
		attribution: '防災科学技術研究所',
		location: '全国',
		tags: ['地すべり', '地形'],
		minZoom: 5,
		maxZoom: 15,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: {
			z: 13,
			x: 7262,
			y: 3214
		},
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#landslide'
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'categorical',
		opacity: 0.7,
		legend: {
			type: 'image',
			categories: [
				{
					name: '滑落産と側方産',
					urls: [
						`${IMG}/0.webp`,
						`${IMG}/1.webp`,
						`${IMG}/2.webp`,
						`${IMG}/3.webp`,
						`${IMG}/4.webp`,
						`${IMG}/5.webp`,
						`${IMG}/6.webp`,
						`${IMG}/7.webp`
					],
					labels: [
						'新鮮なまたは開析されていない冠頂をもつ滑落崖',
						'部分的に開析されている冠頂をもつ滑落崖',
						'冠頂が著しく開析された滑落崖',
						'冠頂が丸味をおびて不明瞭になった滑落崖',
						'開析されて無くなってしまった冠頂・滑落崖の推定復元位置',
						'共通の冠頂をもち、互いに反対方向を向く滑落崖',
						'中・緩斜の流れすべり面が地表に露出し、滑落崖にあたる急崖を呈しない斜面。冠頂は尾根の反対側斜面とすべり面との交線',
						'後方崖、多重稜線等'
					]
				},
				{
					name: '移動体の輪郭・境界',
					urls: [
						`${IMG}/8.webp`,
						`${IMG}/9.webp`,
						`${IMG}/10.webp`,
						`${IMG}/11.webp`,
						`${IMG}/12.webp`,
						`${IMG}/13.webp`
					],
					labels: [
						'後方に滑落崖があり、移動体の輪郭が明瞭ないし判定可能',
						'後方の滑落崖は明瞭であるが、移動体の輪郭の判定が困難',
						'滑落崖はほとんど開析されてしまったが、過去の移動体の一部（不安定土塊）が残存している',
						'ほかの移動体や堆積物におおわれた部分',
						'斜面体の移動の初期状態、基岩から分離していないとしても不安定域・移動域と推定される範囲',
						'斜面移動体かどうか判定できない山体・小丘'
					]
				},
				{
					name: '移動体の輪郭・境界',
					urls: [
						`${IMG}/9.webp`,
						`${IMG}/10.webp`,
						`${IMG}/11.webp`,
						`${IMG}/12.webp`,
						`${IMG}/13.webp`
					],
					labels: ['', '', '', '', '', '', '', '', '', '']
				}
			]
		}
	}
};

export default entry;
