import {
	createHimawariFallbackEntry,
	type HimawariProductConfig
} from '$routes/map/api/himawari';

const config: HimawariProductConfig = {
	id: 'himawari_snd',
	name: '気象衛星ひまわり 雲頂強調画像',
	band: 'SND',
	prod: 'ETC',
	description:
		'気象衛星ひまわりの雲頂強調画像。観測時刻ごとの発達した雲の分布や変化を強調表示で確認する際に利用できる。',
	tags: ['気象', '衛星'],
	xyzImageTile: { x: 7, y: 3, z: 3 },
	downloadUrl: 'https://www.data.jma.go.jp/mscweb/ja/prod/rgb_snd.html'
};

const entry = createHimawariFallbackEntry(config);

export default entry;
