import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/meta_data/_bounds';
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
					name: '輪郭構造 滑落産と側方産',
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
					name: '輪郭構造 移動体の輪郭・境界',
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
					name: '内部構造',
					urls: [
						`${IMG}/14.webp`,
						`${IMG}/15.webp`,
						`${IMG}/16.webp`,
						`${IMG}/17.webp`,
						`${IMG}/18.webp`,
						`${IMG}/19.webp`,
						`${IMG}/20.webp`
					],
					labels: [
						'二次・小滑落崖、崖線の解析程度に応じて輪郭構造の場合と同様に表わす',
						'サブユニットの境界、内部（二次）移動体輪郭',
						'移動体内の小尾根',
						'幅の広い溝状凹地、亀裂',
						'幅の狭い溝状凹地、亀裂',
						'雁行亀裂',
						'線状窪地・小谷底線'
					]
				},
				{
					name: '移動体の主移動方向',
					urls: [
						`${IMG}/21.webp`,
						`${IMG}/22.webp`,
						`${IMG}/23.webp`,
						`${IMG}/24.webp`,
						`${IMG}/25.webp`,
						`${IMG}/26.webp`
					],
					labels: [
						'すべり',
						'クリープ（匍行）',
						'流れ・押出し',
						'落石',
						'前方への傾動または傾動を伴う移動とその方向',
						'元の斜面傾斜と逆方向へ傾動した斜面の傾斜方向'
					]
				}
			]
		}
	}
};

export default entry;
