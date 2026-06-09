import { createHazardMapPortalEntry } from './_hazard_map_portal';

const entry = createHazardMapPortalEntry({
	id: 'hazard_kyukeisha',
	name: '急傾斜地崩壊危険区域',
	description:
		'急傾斜地の崩壊に関する土砂災害警戒区域を区分して表現した地図。警戒区域と特別警戒区域の確認に利用できる。',
	url: 'https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png',
	tags: ['ハザード', '土砂災害', '急傾斜地'],
	guideColor: [
		{ color: '#FA684C', label: '特別警戒区域' },
		{ color: '#FFED4C', label: '警戒区域' }
	],
	xyzImageTile: { x: 28850, y: 12920, z: 15 }
});

export default entry;
