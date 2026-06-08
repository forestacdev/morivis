import { createHazardMapPortalEntry } from './_hazard_map_portal';

const entry = createHazardMapPortalEntry({
	id: 'hazard_flood',
	name: '洪水浸水想定区域',
	description:
		'洪水時の想定浸水深を区分して表現した地図。浸水深の分布と浸水想定区域の確認に利用できる。',
	url: 'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png',
	tags: ['ハザード', '洪水', '浸水'],
	guideColor: [
		{ color: '#DC7ADC', label: '20.0m以上' },
		{ color: '#F286C9', label: '10.0〜20.0m' },
		{ color: '#FF9091', label: '5.0〜10.0m' },
		{ color: '#FFB7B7', label: '3.0〜5.0m' },
		{ color: '#FFD8C0', label: '0.5〜3.0m' },
		{ color: '#F0F0A0', label: '0.5未満' }
	],
	xyzImageTile: { x: 7276, y: 3212, z: 13 }
});

export default entry;
