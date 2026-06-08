import { createHazardMapPortalEntry } from './_hazard_map_portal';

const entry = createHazardMapPortalEntry({
	id: 'hazard_hightide',
	name: '高潮浸水想定区域',
	description:
		'高潮時の想定浸水深を区分して表現した地図。高潮による浸水深の分布と浸水想定区域の確認に利用できる。',
	url: 'https://disaportaldata.gsi.go.jp/raster/03_hightide_l2_shinsuishin_data/{z}/{x}/{y}.png',
	tags: ['ハザード', '高潮', '浸水'],
	guideColor: [
		{ color: '#DC7ABC', label: '20.0m以上' },
		{ color: '#F285C9', label: '10.0〜20.0m' },
		{ color: '#FF9191', label: '5.0〜10.0m' },
		{ color: '#FFB7B7', label: '3.0〜5.0m' },
		{ color: '#FFD8C0', label: '1.0〜3.0m' },
		{ color: '#F8E1A6', label: '0.5〜1.0m' },
		{ color: '#F7F5A9', label: '0.3〜0.5m' },
		{ color: '#FEFFB3', label: '0.3未満' }
	],
	xyzImageTile: { x: 3604, y: 1621, z: 12 }
});

export default entry;
