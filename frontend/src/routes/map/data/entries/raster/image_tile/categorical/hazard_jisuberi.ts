import { createHazardMapPortalEntry } from './_hazard_map_portal';

const entry = createHazardMapPortalEntry({
	id: 'hazard_jisuberi',
	name: '地すべり危険区域',
	description:
		'地すべりに関する土砂災害警戒区域を区分して表現した地図。警戒区域と特別警戒区域の確認に利用できる。',
	url: 'https://disaportaldata.gsi.go.jp/raster/05_jisuberikeikaikuiki/{z}/{x}/{y}.png',
	tags: ['ハザード', '土砂災害', '地すべり'],
	guideColor: [
		{ color: '#CA4B94', label: '特別警戒区域' },
		{ color: '#FFB74C', label: '警戒区域' }
	],
	xyzImageTile: { x: 14280, y: 6556, z: 14 }
});

export default entry;
