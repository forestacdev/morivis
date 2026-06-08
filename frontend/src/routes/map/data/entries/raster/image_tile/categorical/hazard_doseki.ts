import { createHazardMapPortalEntry } from './_hazard_map_portal';

const entry = createHazardMapPortalEntry({
	id: 'hazard_doseki',
	name: '土石流危険区域',
	description:
		'土石流に関する土砂災害警戒区域を区分して表現した地図。警戒区域と特別警戒区域の確認に利用できる。',
	url: 'https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png',
	tags: ['ハザード', '土砂災害', '土石流'],
	guideColor: [
		{ color: '#C04B63', label: '特別警戒区域' },
		{ color: '#ECD86F', label: '警戒区域' }
	],
	xyzImageTile: { x: 28850, y: 12920, z: 15 }
});

export default entry;
