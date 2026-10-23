import type { ImageLegend } from '$routes/map/data/types/raster';

// BGR公式の個別記号画像と原語ラベル。表示するレイヤーの凡例だけを収録。
// 出典: https://services.bgr.de/arcgis/rest/services/geologie/gk2000/MapServer/legend?f=pjson
const SERVICE_URL = 'https://services.bgr.de/arcgis/rest/services/geologie/gk2000/MapServer';

const groups = [
	{
		'layerId': 4,
		'name': '地質年代（原語：ドイツ語）',
		'items': [
			[
				'c4d92537422fa844887f9d274b32cc45',
				'Holozän'
			],
			[
				'c8cf99a18f857d54c96d4ec734e86456',
				'Pleistozän'
			],
			[
				'406c4f66d6f89f462256aebb3edbce70',
				'Weichsel-/Würm-Kaltzeit'
			],
			[
				'44c3838baae2ddf19c8ffc408df7821c',
				'Saale-/Riss-Kaltzeit'
			],
			[
				'44c3838baae2ddf19c8ffc408df7821c',
				'Elster-/Mindel-Kaltzeit'
			],
			[
				'654fbdee1ed555bb7339cbc3f472ac87',
				'Neogen'
			],
			[
				'3f6e9d8dd2eef86a8849448e6c4f0666',
				'Paläogen'
			],
			[
				'9f3161b344207e63e8482b70c30a93de',
				'Kreide (ungegliedert)'
			],
			[
				'1c172abcf08b83ff9f02a4cc632b9a9d',
				'Oberkreide'
			],
			[
				'6e4618b63245f2f0ac51b8fc8a4c7e02',
				'Unterkreide'
			],
			[
				'034eda7d3bf6fdf0bc258f12b3ed7f65',
				'Jura (ungegliedert)'
			],
			[
				'c6f9be86744c094b1a4f63c044e2c5e3',
				'Oberjura'
			],
			[
				'306ac115b4051ca1ecd10b2cd56aaf16',
				'Mitteljura'
			],
			[
				'30dd0486cd8cf95c5c4d955d79bd80f7',
				'Unterjura'
			],
			[
				'479214ba4a5fd74c8effbf6e3ab5539c',
				'Trias (ungegliedert)'
			],
			[
				'e18d769f3a25482d92500af0cef9d029',
				'Obertrias'
			],
			[
				'd4b1532e16160bf7b7f2da1ba2f82e0d',
				'Mitteltrias'
			],
			[
				'd45d1ff44246d00e5f756c7abaf231ab',
				'Untertrias'
			],
			[
				'3ccf1f573dd9f00939fa2ed72feee15d',
				'Paläozoikum'
			],
			[
				'1742ff8109c49e8090c3c4d82de9fb75',
				'Oberperm'
			],
			[
				'641dba011e5d0c03020ddce8326ab2ad',
				'Unterperm'
			],
			[
				'e63d2d896c1aa9370b4f528d55c88076',
				'Karbon'
			],
			[
				'0b8d1d2d877fb5996f70814bebf8bf4d',
				'Devon (ungegliedert)'
			],
			[
				'55a43d31f0d836f4fc941b3fd3022087',
				'Oberdevon'
			],
			[
				'c9bbeb040891fb4ebbccd2db77b93e2f',
				'Mitteldevon'
			],
			[
				'b33e35bdf7fe7bc44e176082a59aaa41',
				'Unterdevon'
			],
			[
				'f408bba2da0a6c71dc65d399259c93c1',
				'Silur'
			],
			[
				'f725fb0fc2de0c0b9a8cc123582f7ccc',
				'Ordovizium'
			],
			[
				'07618548329dd027f150b44e8d15237e',
				'Kambrium'
			],
			[
				'89a53830572a944e18d593ac8c04bf4f',
				'Präkambrium'
			],
			[
				'd1430a01c65ff87bed73d6477baef790',
				'Plutonite (ungegliedert)'
			],
			[
				'5c5369d959c05beb08288c94da4dce21',
				'Känozoische Vulkanite'
			],
			[
				'9766ef6192ca01cf8f607eb8e596cf06',
				'Paläozoische Vulkanite'
			]
		]
	},
	{
		'layerId': 3,
		'name': '変成岩の構造（原語：ドイツ語）',
		'items': [
			[
				'ea28e4780cfd7b889bfc988407c79f82',
				'Metamorphe Strukturen'
			]
		]
	},
	{
		'layerId': 2,
		'name': '地質構造（原語：ドイツ語）',
		'items': [
			[
				'66969f72bc828e22c7b30688fc168c55',
				'Störung'
			],
			[
				'70a0ebfe276343a3e9a4f754a900cb9d',
				'Störung, vermutet'
			],
			[
				'bbe13dbe4e5048fae31ec305fcd10138',
				'Überschiebung'
			],
			[
				'04cd1f96612f62bb1fd38cb798d017af',
				'Überschiebung, vermutet'
			]
		]
	},
	{
		'layerId': 1,
		'name': '隕石衝突クレーター（原語：ドイツ語）',
		'items': [
			[
				'ae14c971298b0f80108ae776335db6f1',
				'Kraterrand'
			]
		]
	},
	{
		'layerId': 0,
		'name': '氷床の縁（原語：ドイツ語）',
		'items': [
			[
				'79c5e23965d28db47877693dd0bab538',
				'Weichsel-/Würm-Kaltzeit'
			],
			[
				'89ac4d8df02eac813f91d0b1c5b9f75c',
				'Saale-/Riss-Kaltzeit'
			],
			[
				'7c52e31f216797cb6aa3839aaef6056f',
				'Elster-/Mindel-Kaltzeit'
			]
		]
	}
] as const;

const legend: ImageLegend = {
	type: 'image',
	categories: groups.map(({ layerId, name, items }) => ({
		name,
		urls: items.map(([image]) => `${SERVICE_URL}/${layerId}/images/${image}`),
		labels: items.map(([, label]) => label)
	}))
};

export default legend;
