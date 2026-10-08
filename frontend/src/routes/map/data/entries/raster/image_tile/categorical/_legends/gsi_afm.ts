import { LEGEND_DATA_PATH } from '$routes/constants';
import type { ImageLegend } from '$routes/map/data/types/raster';

// 出典: https://www.gsi.go.jp/common/000084060.pdf
const IMG = LEGEND_DATA_PATH + '/gsi_afm';
const groups = [
	{
		name: '活断層・変位地形',
		items: [
			['fault-01.webp', '活断層'],
			['fault-02.webp', '活断層（位置やや不明確）'],
			['fault-03.webp', '活断層（活撓曲）'],
			['fault-04.webp', '活断層（伏在部）'],
			['fault-05.webp', '横ずれ'],
			['fault-06.webp', '縦ずれ'],
			['fault-07.webp', '地震断層'],
			['fault-08.webp', 'トレンチ調査地点'],
			['fault-09.webp', '活断層露頭'],
			['fault-10.webp', '活断層の名称'],
			['fault-11.webp', '推定活断層（地表）'],
			['fault-12.webp', '推定活断層（地表）（位置やや不明確）'],
			['fault-13.webp', '推定活断層（地下）'],
			['fault-14.webp', '活褶曲'],
			['fault-15.webp', '地形面の傾動方向'],
			['fault-16.webp', '活断層（海（湖）底部）'],
			['fault-17.webp', '推定活断層（海（湖）底部）'],
			['fault-18.webp', '活断層（活撓曲）（海（湖）底部）'],
			['fault-19.webp', '活褶曲（海底部）']
		]
	},
	{
		name: '地形分類',
		items: [
			['landform-01.webp', '上位段丘面'],
			['landform-02.webp', '中位段丘面'],
			['landform-03.webp', '下位段丘面'],
			['landform-04.webp', '沖積低地'],
			['landform-05.webp', '扇状地・沖積錐'],
			['landform-06.webp', '埋立地・干拓地'],
			['landform-07.webp', '砂丘'],
			['landform-08.webp', '地すべり'],
			['landform-09.webp', '変位した谷線'],
			['landform-10.webp', '火口・カルデラ'],
			['landform-11.webp', '溶岩円頂丘'],
			['landform-12.webp', '溶岩流堆積面'],
			['landform-13.webp', '火砕流堆積面'],
			['landform-14.webp', '岩屑なだれ堆積面'],
			['landform-15.webp', '泥流堆積面'],
			['landform-16.webp', '氷成堆積物堆積面'],
			['landform-17.webp', '2024年の地震の際に海面上に現れた可能性のある岩礁・海浜等']
		]
	},
	{
		name: '段丘面の細分',
		items: [
			['terrace-01.webp', '上位段丘面1（相対的に古い時代）'],
			['terrace-02.webp', '上位段丘面2（比較的新しい時代）'],
			['terrace-03.webp', '中位段丘面1（比較的古い時代）'],
			['terrace-04.webp', '中位段丘面2（比較的新しい時代）'],
			['terrace-05.webp', '下位段丘面1（比較的古い時代）'],
			['terrace-06.webp', '下位段丘面2（比較的新しい時代）']
		]
	}
];

const legend: ImageLegend = {
	type: 'image',
	categories: groups.map((group) => ({
		name: group.name,
		urls: group.items.map(([file]) => `${IMG}/${file}`),
		labels: group.items.map(([, label]) => label)
	}))
};

export default legend;
