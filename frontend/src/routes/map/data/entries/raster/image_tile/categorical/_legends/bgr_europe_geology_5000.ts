import type { ImageLegend } from '$routes/map/data/types/raster';

// BGR公式の個別記号画像と原語ラベル。表示するレイヤーの凡例だけを収録。
// 出典: https://services.bgr.de/arcgis/rest/services/inspire_ge/igme5000eu/MapServer/legend?f=pjson
const SERVICE_URL = 'https://services.bgr.de/arcgis/rest/services/inspire_ge/igme5000eu/MapServer';

const groups = [
	{
		'layerId': 3,
		'name': '地質年代 / Cenozoic（原語：英語）',
		'items': [
			[
				'2020b59f75f20a475e8dcc1dead905f9',
				'Cenozoic'
			],
			[
				'0e9ca7c5296fbec6c272b116158581db',
				'Holocene'
			],
			[
				'55fed08b88f95316aa8b7e361e3f885d',
				'Pleistocene'
			],
			[
				'c5deb097a28c19719756d35ad7e0a1e7',
				'Gelasian'
			],
			[
				'2881c9bfecbf8b392ebda27abfcca8df',
				'Neogene'
			],
			[
				'fd82f7f2bffb680e5603e71f6cd2bc6e',
				'Pliocene'
			],
			[
				'e0c2352a3c5f9e1519bf1c5d91f144ea',
				'Miocene'
			],
			[
				'e582ed23a847a3aab18606ba0c7bed41',
				'Paleogene'
			],
			[
				'f794b4e9b1a1f500898c6341da625925',
				'Oligocene'
			],
			[
				'bddefe4862acacab7a41090cbdaf14fa',
				'Eocene'
			],
			[
				'cc3e8b08cf8a3c3682fd083cd44cdfca',
				'Paleocene'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地質年代 / Mesozoic（原語：英語）',
		'items': [
			[
				'c239ccc736ddd470695471497731425b',
				'Mesozoic'
			],
			[
				'f164ca428136001943f783a33dea1620',
				'Cretaceous'
			],
			[
				'1d3e7c330054840de9f4c292a41045a2',
				'Upper Cretaceous'
			],
			[
				'1917b6d4dd49cdc8d457d7287b5397ff',
				'Cenomanian'
			],
			[
				'ccd743afafd0d39d042e32a23e04c5e9',
				'Berriasian'
			],
			[
				'5cfdd6e057bac911b1875def53773620',
				'Jurassic'
			],
			[
				'0f31ea058e41fee46371c204dddf39d4',
				'Upper Jurassic'
			],
			[
				'93c1b2287e187c8d8daffea7c830f053',
				'Oxfordian'
			],
			[
				'7d917d7326db1140216faf3416923f75',
				'Middle Jurassic'
			],
			[
				'3fdcdd2fd4cee9f50b1a8065cf20d2d5',
				'Lower Jurassic'
			],
			[
				'a073ab28a6341c70551a07e17e8877aa',
				'Upper Triassic'
			],
			[
				'eb7b1fd3857c52f20760cd9ed80837e6',
				'Norian'
			],
			[
				'299b05138ed083c083b8f1c90e44ad6e',
				'Carnian'
			],
			[
				'743d8b583727998b648e5d08e9938b32',
				'Anisian'
			],
			[
				'c0fd180b18e81ab36b87f45cffd06b5f',
				'Lower Triassic'
			],
			[
				'17f29eb066c4140b23e46d766955d266',
				'Induan'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地質年代 / Paleozoic（原語：英語）',
		'items': [
			[
				'58eb752df16f62371f2fdaac62a6ebf2',
				'Permian'
			],
			[
				'4e7ae45b1523470cbff24deb7e6ad8da',
				'Lopingian'
			],
			[
				'ad68f93dc4f1c7f4615c0906cf258811',
				'Wuchiapingian'
			],
			[
				'e1fad09ba17e0b1f5f2234dc60bbc20b',
				'Cisuralian'
			],
			[
				'cf4f224c042aa728ea95144ede390e50',
				'Carboniferous'
			],
			[
				'3905e585221e2c92c694b28a63fb91d2',
				'Pennsylvanian'
			],
			[
				'2eda6c4cb28b006fa89de3b839f6d5b3',
				'Lower Pennsylvanian'
			],
			[
				'a10183c7d945da6489ea215305ef0ade',
				'Lower Mississippian'
			],
			[
				'c263128ae5584b2598706dce4e213b5c',
				'Devonian'
			],
			[
				'cba0b9bfd88e5d39b3195578eaa6503b',
				'Upper Devonian'
			],
			[
				'c2549ab5ffb87c9514e043ad0de0c2a8',
				'Frasnian'
			],
			[
				'0985661269dabac2a3dea24deada56d7',
				'Middle Devonian'
			],
			[
				'0a06ee8eff0f90cc48318e1729b101c6',
				'Lower Devonian'
			],
			[
				'dd77f4b041ba390172bf6f9ea6cd3524',
				'Pridoli'
			],
			[
				'baf18e6b4678c6c9c6dfb5e1080baeb8',
				'Wenlock'
			],
			[
				'1fdcf88941b8af3e5fdbb7ef808572bb',
				'Llandovery'
			],
			[
				'176f0ff298700717b55f1837972a8def',
				'Rhuddanian'
			],
			[
				'6ba05bea100d2d062f107eec3e1f8db5',
				'Ordovician'
			],
			[
				'72ce3daf988d493305db28ab359d70f7',
				'Upper Ordovician'
			],
			[
				'4a47a197a817bb0cd0ff248cc2e7931e',
				'Sandbian'
			],
			[
				'10f224613b213e29695098c906930f30',
				'Middle Ordovician'
			],
			[
				'b0139c6ed6ea939d4afcce95732ca1d2',
				'Cambrian-Series 3'
			],
			[
				'ee8963aa0ac3df4f492fda5ef648cdc3',
				'Lower Ordovician'
			],
			[
				'4c8c0cc63d663b5915e4994575e6836f',
				'Tremadocian'
			],
			[
				'5d4714238cf8397de6c137f0cd39e027',
				'Cambrian'
			],
			[
				'43123a2aafc049d93a4a5880ad9d75d4',
				'Terreneuvian'
			],
			[
				'e794f795a530057351c970e0de7d1ef8',
				'Cambrian-Series 2'
			],
			[
				'b0dccb64987c134c9bac2a0389bc0985',
				'Dapingian'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地質年代 / Precambrian（原語：英語）',
		'items': [
			[
				'02266cedf7e2ea3e7cdf2ee0d4612013',
				'Precambrian'
			],
			[
				'678d6ff6dbf397227f61bd03a80a033a',
				'Neoproterozoic'
			],
			[
				'59d54f9856a137824ce587f73c4c5d7e',
				'Cryogenian'
			],
			[
				'6f1979f25466e6a40f264211945349c2',
				'Tonian'
			],
			[
				'fb8abdfc6c548e439e192a0f0f4b9881',
				'Mesoproterozoic'
			],
			[
				'e28792343a968100eb4ac85b69723215',
				'Siderian'
			],
			[
				'f63056a9d1f04d7b4ff87a3e78c62ce0',
				'Archean'
			],
			[
				'a61db0c1bc9cd582f1b30ee97a36be89',
				'Hadean (informal)'
			]
		]
	},
	{
		'layerId': 1,
		'name': '断層（原語：英語）',
		'items': [
			[
				'66969f72bc828e22c7b30688fc168c55',
				'fault'
			],
			[
				'4c06fee6cc74f5ffd59ffadec434d2d5',
				'strike slip fault '
			],
			[
				'4c06fee6cc74f5ffd59ffadec434d2d5',
				'dextral strike slip fault '
			],
			[
				'4c06fee6cc74f5ffd59ffadec434d2d5',
				'sinistral strike slip faul'
			],
			[
				'455e4544010ab451502e933413332643',
				'thrust fault'
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
