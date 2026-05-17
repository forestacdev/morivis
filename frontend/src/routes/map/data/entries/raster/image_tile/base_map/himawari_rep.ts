import { loadHimawariRasterEntry, type HimawariProductConfig } from '$routes/map/api/himawari';

const config: HimawariProductConfig = {
	id: 'himawari_rep',
	name: '気象衛星ひまわり トゥルーカラー再現画像',
	band: 'REP',
	prod: 'ETC',
	description:
		'気象衛星ひまわりのトゥルーカラー再現画像。観測時刻ごとの雲域や地表の見え方を自然色に近い表現で確認する際に利用できる。',
	tags: ['気象', '衛星'],
	xyzImageTile: { x: 7, y: 3, z: 3 },
	downloadUrl: 'https://www.data.jma.go.jp/sat_info/himawari/satobs.html'
};

const entry = await loadHimawariRasterEntry(config);

export default entry;
