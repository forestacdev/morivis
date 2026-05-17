import { loadHimawariRasterEntry, type HimawariProductConfig } from '$routes/map/api/himawari';

const config: HimawariProductConfig = {
	id: 'himawari_b13',
	name: '気象衛星ひまわり 赤外画像',
	band: 'B13',
	prod: 'TBB',
	description:
		'気象衛星ひまわりの赤外輝度温度画像。観測時刻ごとの雲域や雲頂温度の変化を確認する際に利用できる。',
	tags: ['気象', '衛星'],
	xyzImageTile: { x: 7, y: 3, z: 3 },
	downloadUrl: 'https://www.data.jma.go.jp/mscweb/ja/prod/band_b13.html'
};

const entry = await loadHimawariRasterEntry(config);

export default entry;
