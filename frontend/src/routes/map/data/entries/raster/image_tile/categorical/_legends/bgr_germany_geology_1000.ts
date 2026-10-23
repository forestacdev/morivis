import type { ImageLegend } from '$routes/map/data/types/raster';

// BGR公式の個別記号画像と原語ラベル。表示するレイヤーの凡例だけを収録。
// 出典: https://services.bgr.de/arcgis/rest/services/geologie/gk1000/MapServer/legend?f=pjson
const SERVICE_URL = 'https://services.bgr.de/arcgis/rest/services/geologie/gk1000/MapServer';

const groups = [
	{
		'layerId': 3,
		'name': '地層 / Quartär, Holozän（原語：ドイツ語）',
		'items': [
			[
				'569c86396c90f839774b527ca6fc9763',
				'Holozän, Sandschlick'
			],
			[
				'72112f0f86ecd1a00f6fe2774c442486',
				'Holozän, Schluff'
			],
			[
				'8c102654b5c1709a98fa5ae4607983c1',
				'Holozän, Feinsand'
			],
			[
				'964f9bb4ee02ec0620f2680a296f7d45',
				'Holozän, Feinsand bis Mittelsand'
			],
			[
				'dad44fb11c54ab3eba3a24709885e019',
				'Holozän, Mittelsand'
			],
			[
				'32ee5f1284f3174bd514c62289ad5b57',
				'Holozän, Grobsand'
			],
			[
				'2c1aa8ae61f74e065f635231d6de9b88',
				'Holozän, Restsediment'
			],
			[
				'29dfd26efa0b031c8e927da64fb03592',
				'Holozän, Wattablagerung'
			],
			[
				'dc9b27b153da86a2083267dc1f8e7e96',
				'Holozän, marin'
			],
			[
				'c1f00abff9440573e4628a7729e337a1',
				'Holozän, limnisch'
			],
			[
				'c1779fcd3127881f0d7a30e1f2ad94ff',
				'Holozän, Hochmoor'
			],
			[
				'51c43bab1ac81676762e8d55feec3427',
				'Holozän, Niedermoor'
			],
			[
				'a10c6138243d83904d7da0db4d58cf66',
				'Holozän, Flussablagerungen'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Quartär, Pleistozän（原語：ドイツ語）',
		'items': [
			[
				'c5deb097a28c19719756d35ad7e0a1e7',
				'Pleistozän-Holozän, äolisch'
			],
			[
				'c5deb097a28c19719756d35ad7e0a1e7',
				'Pleistozän-Holozän, äolisch (Dünen)'
			],
			[
				'c5deb097a28c19719756d35ad7e0a1e7',
				'Pleistozän, äolisch'
			],
			[
				'b4b06d2394cf7db999135ab106607c6b',
				'Pleistozän-Holozän, Quellkalk'
			],
			[
				'7651adfa21fd39e2023d175a546d31c0',
				'Pleistozän, Löss'
			],
			[
				'e759349e08905c9ed19f89b0b1873e23',
				'Pleistozän, Sandlöss'
			],
			[
				'5c8265925e09a6f00d19f417aabb9d32',
				'Pleistozän, Weichsel-Kaltzeit'
			],
			[
				'2be1f4335f51b49715d30708124841f1',
				'Pleistozän, Weichsel-Kaltzeit, Schmelzwasserablagerungen (inkl. Sander, Oser, Kame)'
			],
			[
				'25240e5eaaa93daa3c66bbdfca6b846c',
				'Pleistozän, Weichsel-Kaltzeit, Schmelzwasserablagerungen (inkl. Urstromtäler)'
			],
			[
				'a33700640b0055510420d20ae8bc7eff',
				'Pleistozän, Würm-Kaltzeit, Schmelzwasserablagerungen'
			],
			[
				'4b41d6e1267f544250c08e672f309775',
				'Pleistozän, Weichsel-Kaltzeit, Grundmoräne'
			],
			[
				'933887210ab4f2171ae4445fce5a16a1',
				'Pleistozän, Weichsel-Kaltzeit, Endmoräne'
			],
			[
				'4b41d6e1267f544250c08e672f309775',
				'Pleistozän, Würm-Kaltzeit, Moränenablagerungen'
			],
			[
				'999e371aed1d6bce36e2eacf6990ced8',
				'Pleistozän, Würm-Kaltzeit, glazilimnisch-limnisch'
			],
			[
				'ba7ed7bfb9ff0c5fca3a6bc6f5eb3cdf',
				'Pleistozän, Weichsel-Kaltzeit, Beckenablagerung'
			],
			[
				'f6915480436b4ecf3c759a56ed4adba6',
				'Pleistozän, Eem-Interglazial'
			],
			[
				'e420f1351ca147e703ce72bb31c701b1',
				'Pleistozän, Saale-Kaltzeit'
			],
			[
				'a736c068848fe1ef592b7d8b448cfaf9',
				'Pleistozän, Saale-Kaltzeit, Schmelzwasserablagerungen (inkl. Sander, Oser, Kame)'
			],
			[
				'11efffc192a5e0b8d6ccfa2a0a35514c',
				'Pleistozän, Riss-Kaltzeit, Schmelzwasserablagerungen'
			],
			[
				'8e0016c067ce952baa09fc0bc45f2558',
				'Pleistozän, Riss-Würm-Kaltzeit, Schmelzwasserablagerungen'
			],
			[
				'02fc50057bbc777ce85a4b4fa1fb876e',
				'Pleistozän, Saale-Kaltzeit, Grundmoräne'
			],
			[
				'6c69773d556fffb7494610596e71da11',
				'Pleistozän, Saale-Kaltzeit, Endmoräne'
			],
			[
				'5712da41ae11035dbac82736c28c7090',
				'Pleistozän, Riss-Kaltzeit, Moränenablagerungen'
			],
			[
				'fcb2d874418020ba621fc2a8f67c58b2',
				'Pleistozän, Saale-Weichsel-Kaltzeit, Niederterrasse'
			],
			[
				'1d4f8730f90b3fe766e47a278b553087',
				'Pleistozän, Saale-Kaltzeit, Beckenablagerung'
			],
			[
				'28be47b325fe8d5e0fac00a5dd1f4441',
				'Pleistozän, Holstein-Interglazial'
			],
			[
				'7f25a18b22073c323fef50ea828580ba',
				'Pleistozän, Elster-Kaltzeit, Schmelzwasserablagerungen (inkl. Sander, Oser, Kame)'
			],
			[
				'8ed9a9bb962d2f84dc890cfdc04f4cd8',
				'Pleistozän, Elster-Kaltzeit, Grundmoräne'
			],
			[
				'8ed9a9bb962d2f84dc890cfdc04f4cd8',
				'Pleistozän, Elster-Kaltzeit, glaziär'
			],
			[
				'f3427790a77a7924666e499246d2cdeb',
				'Pleistozän, Elster-Kaltzeit, Endmoräne'
			],
			[
				'a5540e2ead26cfe3f1a77cdc19e98d3d',
				'Pleistozän, Elster-Kaltzeit, Beckenablagerung ("Lauenburger Ton")'
			],
			[
				'fcfb6cce71ed5a86de6f4441509bbe01',
				'Pleistozän, Cromer-Saale-Kaltzeit, Mittelterrasse'
			],
			[
				'0a6db612497f866683690f6fc9bba0ad',
				'Pleistozän, Günz-Mindel-Kaltzeit, Schmelzwasserablagerungen'
			],
			[
				'6bba16c06755d98c44ad6e62c13a9fd9',
				'Pleistozän, Günz-Mindel-Kaltzeit, Moränenablagerungen'
			],
			[
				'b676711ac673aaaa72126f75089eaa69',
				'Pleistozän, Flussablagerungen'
			],
			[
				'65fbd3f2380fe3ad7a44cbec7658f22c',
				'Pleistozän, Prätegel-Cromer, Haupt-/Höhenterrasse'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Tertiär（原語：ドイツ語）',
		'items': [
			[
				'fce41dc2478f3b32505d08422c80e598',
				'Neogen-Quartär, Lehm'
			],
			[
				'41be728749b6397cc7c6fe8873df8757',
				'Paläogen-Neogen'
			],
			[
				'2b02e857512ad0e9719afedf21a16b70',
				'Pliozän'
			],
			[
				'71ca661453619a13a0d9f50524eb5ed8',
				'Miozän'
			],
			[
				'308293e23751c7ba297a8e9e575d3932',
				'Miozän, Langhium-Tortonium, Obere Süsswassermolasse'
			],
			[
				'146160e597d31b47be55f984b45b722d',
				'Miozän, Burdigalium, Obere Meeresmolasse'
			],
			[
				'08f3b7ddfe7805590411760748ddcd31',
				'Oligozän'
			],
			[
				'74d2d85e40d774a34a9efb7c5bab2009',
				'Oligozän-Miozän, Chattium-Aquitanium, Untere Süsswassermolasse'
			],
			[
				'8dd1cd53a1faae2cfd6e7c75ac63733f',
				'Oligozän-Miozän, Rupelium-Aquitanium, Untere Meeresmolasse'
			],
			[
				'079a7bd6eafead2a6a736a766ea30bfc',
				'Eozän'
			],
			[
				'3df070a9f35c53ce2f598ecb310dc7a3',
				'Paläozän'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Kreide（原語：ドイツ語）',
		'items': [
			[
				'de4a3d7d00c95bc332d42b00485bbf0f',
				'Kreide'
			],
			[
				'aa4368f85bac5f184996ffc8ddaf6e76',
				'Kreide-Paläogen, Flysch'
			],
			[
				'6692ab173a0f52739316a1bb3c933149',
				'Kreide-Paläogen'
			],
			[
				'd864cf2d8d65e76fb2f600e3b5c3709c',
				'Kreide-Paläogen, Gosau'
			],
			[
				'aa4368f85bac5f184996ffc8ddaf6e76',
				'Kreide, Flysch'
			],
			[
				'e477b6a2c7e118c90f39765350315c88',
				'Oberkreide'
			],
			[
				'2c05673c5d89a41a114d73d0edc973d7',
				'Oberkreide, Campanium'
			],
			[
				'3d428cfda9ac86885616df68219a48f4',
				'Oberkreide, Coniacium-Santonium'
			],
			[
				'b07373fba5b5fd061442f845ac96dbfa',
				'Oberkreide, Cenomanium'
			],
			[
				'f9ba8d9e49bc59fed0d5a4e725de19cd',
				'Oberkreide, Cenomanium-Turonium'
			],
			[
				'401d18f63cb5a0aefe73cdade5a0d52f',
				'Oberkreide, Turonium'
			],
			[
				'16fa43c3495b788610e995486705f1b9',
				'Unterkreide'
			],
			[
				'34b9156cae2c68c7450a9cd41a31ff62',
				'Unterkreide, Albium'
			],
			[
				'16fa43c3495b788610e995486705f1b9',
				'Unterkreide, Barremium-Aptium'
			],
			[
				'16fa43c3495b788610e995486705f1b9',
				'Unterkreide, Valanginium-Hauterivium'
			],
			[
				'9da8acf214edd1ca846502ef6f6a9fd4',
				'Unterkreide, Berriasium (Wealden)'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Jura（原語：ドイツ語）',
		'items': [
			[
				'bd3042d900880562e0cc74746564ad2c',
				'Jura'
			],
			[
				'394d607cb66a141633a915d01f027dbe',
				'Jura-Paläogen'
			],
			[
				'edd9aa8e2cc930346b5c90e11313ef9e',
				'Jura (Klammkalke)'
			],
			[
				'ba583bf0e78e0884885f405630704cf6',
				'Jura  (Radstädter Komplex)'
			],
			[
				'093e626dfe93c65af6790fd1c042a317',
				'Oberjura'
			],
			[
				'bd3042d900880562e0cc74746564ad2c',
				'Unter-/Mitteljura'
			],
			[
				'2f7709234d490e1ef045deaac5d19114',
				'Mitteljura'
			],
			[
				'44ce398fc5509b400ae0bf451cffb248',
				'Unterjura'
			],
			[
				'927942cb9421e4a07d16dc4aaa69bcf0',
				'Jura-Kreide, Aroser Schuppenzone'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Trias（原語：ドイツ語）',
		'items': [
			[
				'5438e534a9736797eb7f4910c1e5e5b3',
				'Trias '
			],
			[
				'6091fc45d1b75f832c0f6579a8cd5c47',
				'Obertrias'
			],
			[
				'6091fc45d1b75f832c0f6579a8cd5c47',
				'Trias, Keuper'
			],
			[
				'2104ebd0728094d6a6d5170e8f8f4e33',
				'Trias, Keuper, Oberer Keuper'
			],
			[
				'd2e532a617f8cdde2ad5b3397f239726',
				'Trias, Keuper, Mittlerer Keuper'
			],
			[
				'882e8410e63523c566d80e3e0255bca2',
				'Trias, Keuper, Mittlerer Keuper, Feuerletten, Knollenmergel'
			],
			[
				'579b0def53134585b4f18ee40ac38809',
				'Trias, Keuper, Mittlerer Keuper, Stubensandstein'
			],
			[
				'e6933e95727b9234bb9a7a5e75ebc03e',
				'Trias, Keuper, Mittlerer Keuper, Gipskeuper, Schilfsandstein'
			],
			[
				'fdd8dddf6c8511713545bb148cb85bcc',
				'Trias, Keuper, Unterer Keuper'
			],
			[
				'ce9714eccd837b3a43af6081e629e367',
				'Trias, Muschelkalk-Keuper'
			],
			[
				'8262d6375c2eae602c2c9a365648a083',
				'Mitteltrias'
			],
			[
				'8262d6375c2eae602c2c9a365648a083',
				'Trias, Muschelkalk'
			],
			[
				'a073ab28a6341c70551a07e17e8877aa',
				'Trias, Muschelkalk, Oberer Muschelkalk'
			],
			[
				'd8bf329cfb311736d95ffdee24edf74c',
				'Trias, Muschelkalk, Mittlerer Muschelkalk'
			],
			[
				'48a0995bd53aaa65c9fcc5af593888dd',
				'Trias, Muschelkalk, Unterer-Mittlerer Muschelkalk'
			],
			[
				'f3cc336ac94e18a8bd68cfd479694bf3',
				'Trias, Muschelkalk, Unterer Muschelkalk'
			],
			[
				'8262d6375c2eae602c2c9a365648a083',
				'Unter-/Mitteltrias'
			],
			[
				'f8f1cb7d853be6a2ab9c6bf056141016',
				'Trias, Buntsandstein'
			],
			[
				'550e72a85409e051c29892bf3b88fa12',
				'Trias, Buntsandstein, Oberer Buntsandstein'
			],
			[
				'1ecd27f0afc6a79eecc8b70bfe488073',
				'Trias, Buntsandstein, Mittlerer Buntsandstein'
			],
			[
				'60e6a964ad4db3eee993cb83700bb9de',
				'Trias, Buntsandstein, Unterer Buntsandstein'
			],
			[
				'8dbf4f520686de1253388707041666d9',
				'Trias-Jura (Bündner Schiefer)'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Perm（原語：ドイツ語）',
		'items': [
			[
				'f8f1cb7d853be6a2ab9c6bf056141016',
				'Perm-Trias'
			],
			[
				'9be16eab287cf13ef35c42023b8604c1',
				'Perm'
			],
			[
				'a7b80243324aef8e02b1ddb36b5ce83a',
				'Perm, Zechstein'
			],
			[
				'e582ed23a847a3aab18606ba0c7bed41',
				'Perm, Rotliegend-Zechstein'
			],
			[
				'492f5c62072d80e570559a8b523003e1',
				'Perm, Rotliegend'
			],
			[
				'f793a23a25e326558f8e3058530d99ac',
				'Perm, Rotliegend, (Ober-)'
			],
			[
				'aabcc201dec25c31b511691c3bdc5267',
				'Perm, Rotliegend, (Unter)'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Karbon（原語：ドイツ語）',
		'items': [
			[
				'b6336413c617ea2d8c797f15fd55ce50',
				'Karbon'
			],
			[
				'c6bd6cc7e05a707a2740d5639753c35b',
				'Oberkarbon'
			],
			[
				'67918445981079224a3e87daec74f4c7',
				'Karbon, Oberkarbon, Stefan'
			],
			[
				'359ee51ef2513a010ca2a427094b1f27',
				'Karbon, Oberkarbon, Westfal'
			],
			[
				'4481e08f9c5aaa95efda7ea0949d1b1f',
				'Karbon, Oberkarbon, Namur'
			],
			[
				'183b2801b478ddce2ede64fc87d578eb',
				'Karbon, Unterkarbon'
			],
			[
				'0deb17deb30eb3223cf2d946e740ccc9',
				'Karbon, Unterkarbon, Olistholithe'
			],
			[
				'ab4aea7e4a997e37606f6ae6164dadfb',
				'Karbon, Unterkarbon, Kalkstein ("Kohlenkalk")'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Devon（原語：ドイツ語）',
		'items': [
			[
				'9aea668c6d8efe98a4c8ff4a17ac8ee0',
				'Devon'
			],
			[
				'1b2160100c48feac3aaac7ea428c074f',
				'Unterdevon, Siegen'
			],
			[
				'de88e45fb9d01df7fac817514d6c7803',
				'Unterdevon, Gedinne'
			],
			[
				'ec0eb3537e227aab859401a343150ccc',
				'Mitteldevon, Givet'
			],
			[
				'ddc22be21189793afbc54971cff19f67',
				'Mitteldevon, Givet, Dolomitstein'
			],
			[
				'd251c402244665a509ff0b04da4d2502',
				'Mitteldevon'
			],
			[
				'97528edada5bcd59e536b6e38c09e2a6',
				'Mitteldevon, Eifel'
			],
			[
				'9aea668c6d8efe98a4c8ff4a17ac8ee0',
				'Unterdevon'
			],
			[
				'97528edada5bcd59e536b6e38c09e2a6',
				'Unterdevon, Ems'
			],
			[
				'2b87794a54c97ebb28190359c81f8718',
				'Unterdevon, Ems, Quarzit'
			],
			[
				'8ed9a9bb962d2f84dc890cfdc04f4cd8',
				'Oberdevon'
			],
			[
				'ddc22be21189793afbc54971cff19f67',
				'Mittel-Oberdevon, Kalkstein'
			],
			[
				'97528edada5bcd59e536b6e38c09e2a6',
				'Mitteldevon, Eifel, Kalkstein'
			],
			[
				'fd74c7129f22b11e4c4074f6d9d6b485',
				'Unterdevon, Siegen, Taunusquarzit'
			],
			[
				'19f8a2faea26683618401998e1b4483b',
				'Unterdevon, Siegen, Hunsrückschiefer'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Silur - Ordovizium（原語：ドイツ語）',
		'items': [
			[
				'9fa5cf645c7288420a0f07b7c850dbc0',
				'Silur'
			],
			[
				'158059492b53b5a40114d714cc1f13c6',
				'Ordovizium-Silur'
			],
			[
				'3e7b2ffd59d1cf5630ea4f4ba78158e5',
				'Ordovizium'
			],
			[
				'089b6c8d7527ab68d75331c4132a0d0d',
				'Ordovizium-Karbon'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Kambrium（原語：ドイツ語）',
		'items': [
			[
				'bd220ada03297b94ad10fb797c0020ee',
				'Kambrium-Ordovizium, Gneis, Grünschiefer'
			],
			[
				'08650d52ae050c70830d768e29d2ba20',
				'Kambrium-Silur, Quarzit, Phyllit'
			],
			[
				'089b6c8d7527ab68d75331c4132a0d0d',
				'Kambrium-Silur, Quarzit, Phyllit'
			],
			[
				'cfc83702b00100c10e64bead4b975429',
				'Kambrium-Ordovizium'
			],
			[
				'089b6c8d7527ab68d75331c4132a0d0d',
				'Kambrium-Ordovizium, Gneis '
			],
			[
				'0907f96f3073f16eacd5cd6547dd05e7',
				'Kambrium-Ordovizium, Gneis, Grünschiefer'
			],
			[
				'659b76a514d9599794efaac60010074e',
				'Kambrium-Ordovizium, Granodiorit, Meta-Granodiorit'
			],
			[
				'089b6c8d7527ab68d75331c4132a0d0d',
				'Kambrium-Silur'
			],
			[
				'089b6c8d7527ab68d75331c4132a0d0d',
				'Kambrium-Silur, Paragneis'
			],
			[
				'089b6c8d7527ab68d75331c4132a0d0d',
				'Kambrium-Silur, Hornfels'
			],
			[
				'85c25d51eef23def7652a4875df32bc2',
				'Kambrium-Silur, Marmor'
			],
			[
				'cfc83702b00100c10e64bead4b975429',
				'Kambrium, Glimmerschiefer'
			],
			[
				'089b6c8d7527ab68d75331c4132a0d0d',
				'Kambrium-Ordovizium, Phyllit'
			],
			[
				'cfc83702b00100c10e64bead4b975429',
				'Kambrium, Phyllit'
			],
			[
				'85c25d51eef23def7652a4875df32bc2',
				'Kambrium-Silur, Glimmerschiefer'
			],
			[
				'cfc83702b00100c10e64bead4b975429',
				'Kambrium'
			],
			[
				'f22001037ffcfa35407b2dd29e8f3487',
				'Kambrium, Deville-Schichten'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Paläozoikum（原語：ドイツ語）',
		'items': [
			[
				'e779d3fec0afc8dbd1ceca7b63f46008',
				'Paläozoikum'
			],
			[
				'f17d71d324757e00cc359c4645e8f680',
				'Paläozoikum, Grünschiefer'
			],
			[
				'089b6c8d7527ab68d75331c4132a0d0d',
				'Paläozoikum, Phyllit'
			],
			[
				'7722f32b8eaf296a51f84d9a3e8eaf53',
				'Paläozoikum, Porphyroide, Porphyroidtuffe'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Proterozoikum（原語：ドイツ語）',
		'items': [
			[
				'e2baedd19a4e4324c37b43fb54d70dcf',
				'Proterozoikum-Ordovizium, Paragneis'
			],
			[
				'f22001037ffcfa35407b2dd29e8f3487',
				'Proterozoikum-Ordovizium, Glimmerschiefer, Quarzit'
			],
			[
				'7feb28e11d762ababd8989bc196ebd95',
				'Proterozoikum, Paragneis'
			],
			[
				'7c11241bec38ea077a73cd81859fb171',
				'Proterozoikum-Ordovizium, Gabbro, Meta-Gabbro'
			],
			[
				'7915424589c63216f0e55e479b05ad39',
				'Proterozoikum-Ordovizium, Orthogneis'
			],
			[
				'a25455afde7fcf9c058b2d1640e2438a',
				'Neoproterozoikum'
			],
			[
				'a25455afde7fcf9c058b2d1640e2438a',
				'Neoproterozoikum, Diatexit'
			],
			[
				'a25455afde7fcf9c058b2d1640e2438a',
				'Neoproterozoikum, Glimmerschiefer'
			],
			[
				'a25455afde7fcf9c058b2d1640e2438a',
				'Neoproterozoikum, Marmor '
			],
			[
				'f22001037ffcfa35407b2dd29e8f3487',
				'Neoproterozoikum - Kambrium'
			],
			[
				'f22001037ffcfa35407b2dd29e8f3487',
				'Neoproterozoikum-Paläozoikum, Kambrium, Gneis '
			],
			[
				'81bd5acfdf5fcba1df93d86c3d6f0cb2',
				'Neoproterozoikum, Blastomylonit'
			],
			[
				'e2baedd19a4e4324c37b43fb54d70dcf',
				'Proterozoikum-Ordovizium, Anatexit'
			],
			[
				'7feb28e11d762ababd8989bc196ebd95',
				'Proterozoikum, Gneis'
			],
			[
				'f22001037ffcfa35407b2dd29e8f3487',
				'Proterozoikum-Ordovizium, Gneis'
			],
			[
				'7feb28e11d762ababd8989bc196ebd95',
				'Proterozoikum, Granulit'
			],
			[
				'f22001037ffcfa35407b2dd29e8f3487',
				'Proterozoikum-Kambrium, Gneis'
			],
			[
				'f22001037ffcfa35407b2dd29e8f3487',
				'Proterozoikum-Kambrium'
			],
			[
				'f22001037ffcfa35407b2dd29e8f3487',
				'Proterozoikum-Ordovizium, Glimmerschiefer, Quarzit'
			],
			[
				'a25455afde7fcf9c058b2d1640e2438a',
				'Neoproterozoikum, Gneis'
			],
			[
				'a25455afde7fcf9c058b2d1640e2438a',
				'Neoproterozoikum, Phyllit'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Astrobleme（原語：ドイツ語）',
		'items': [
			[
				'6648fb23b27480b9524fc7b9e7a7aa88',
				'Miozän, Impaktbreccie'
			],
			[
				'1feabb07d3804a8dc7fbe9d4b2f2116a',
				'Miozän, Impaktmetamorphit'
			],
			[
				'449143f89a2a2859c4e5701f62699ac8',
				'Miozän, Suevit'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Vulkanite（原語：ドイツ語）',
		'items': [
			[
				'e775ac0519043eb9cd1956650cde63ae',
				'Pleistozän, Weichsel-Kaltzeit, Bimstuffe'
			],
			[
				'403fe5a9fcee50dd94df1934ab7be863',
				'Paläogen-Neogen, Trachyt'
			],
			[
				'f0eb854de5e8325ef36463db971cb3a7',
				'Paläogen-Neogen, Trachyt-Tuffe'
			],
			[
				'529e70551b4274d529a228bd4d316846',
				'Pleistozän, Phonolith'
			],
			[
				'6448a5aba1ad1c6d4d668e11cd36d5b3',
				'Pleistozän, Phonolith-Tuffe'
			],
			[
				'241ba638eed83044f99927747ca9c183',
				'Paläogen-Neogen, Phonolith'
			],
			[
				'0484d21a026efbb648a69205c4e3424e',
				'Paläogen-Neogen, basische Tuffe'
			],
			[
				'3cbfbf15ae0307e2d6030fcd147a0f55',
				'Pleistozän, Basalt'
			],
			[
				'be55b473608895e74faddca8849ba5ad',
				'Pleistozän, Basalt-Tuffe'
			],
			[
				'440632dcb7167e9661cdecf84c5e74db',
				'Paläogen-Neogen, Basalt'
			],
			[
				'311b9ad7690db5cd15b63a36115ce7b3',
				'Paläogen-Neogen, Basalt-Tuffe'
			],
			[
				'c2be741ef8f28b4beb46bde48e9b3d0e',
				'Paläozoikum, Porphyroide, Porphyroidtuffe'
			],
			[
				'24bb94f5b7d3d20d7e371ce224f50a1a',
				'Karbon-Perm, Rhyolith '
			],
			[
				'9db5c68453d26cede34961b5910338bc',
				'Kambrium, Rhyolith'
			],
			[
				'56cab4ab8397f9177029438d91d998fc',
				'Karbon-Perm, Andesit'
			],
			[
				'4c9cd465c33290d95b76ed1e25637e4d',
				'Kambrium-Ordovizium, Andesit'
			],
			[
				'7ce8d8553970f145fe23c49f5e353eaf',
				'Devon, Keratophyr, Trachyt'
			],
			[
				'5b0ecac74d2ebf1707dd853d3095f75e',
				'Devon, Keratophyr, Trachyt'
			],
			[
				'e2c0f3bb5ff219f7ae94cf5e366dcf99',
				'Kambrium-Karbon, Keratophyr'
			],
			[
				'e2c0f3bb5ff219f7ae94cf5e366dcf99',
				'Unterkarbon, Spilit'
			],
			[
				'e2c0f3bb5ff219f7ae94cf5e366dcf99',
				'Kambrium-Karbon, Spilit'
			],
			[
				'7ce8d8553970f145fe23c49f5e353eaf',
				'Unterkarbon, Keratophyr'
			],
			[
				'f538fa5243225c6675280e41bb0d81ca',
				'Kambrium-Silur, Amphibolit '
			],
			[
				'f538fa5243225c6675280e41bb0d81ca',
				'Kambrium-Ordovizium, Amphibolit '
			],
			[
				'f538fa5243225c6675280e41bb0d81ca',
				'Proterozoikum-Devon, Amphibolit '
			],
			[
				'f538fa5243225c6675280e41bb0d81ca',
				'Neoproterozoikum, Amphibolit '
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Ganggesteine（原語：ドイツ語）',
		'items': [
			[
				'fd82f7f2bffb680e5603e71f6cd2bc6e',
				'Devon-Perm, Mylonit ("Pfahlschiefer")'
			],
			[
				'bff6cad5d47be768634c355afe95efea',
				'Karbon-Perm, (Gesteinsgang)'
			]
		]
	},
	{
		'layerId': 3,
		'name': '地層 / Plutonite（原語：ドイツ語）',
		'items': [
			[
				'a7334682a56e6dc166bb8b87bc31fbd3',
				'Miozän, Carbonatit'
			],
			[
				'0cfcdd5036e3e0b995227a908a8f3d7f',
				'Miozän, Essexit'
			],
			[
				'3234fde15787ecbd578c42508d18943b',
				'Trias-Kreide, Ophiolithe'
			],
			[
				'8dabfba13dd8eed8808a1a471702933c',
				'Karbon-Perm, Monzonit'
			],
			[
				'0764287a3ddef1de416955c51c77570a',
				'Karbon, Granit'
			],
			[
				'9ff7a86d9e15e510138502ce03e5a8d4',
				'Karbon-Perm, Gabbro'
			],
			[
				'3ea4304b4a8b636a3fc7bad88cb9aca6',
				'Karbon-Perm, Granit'
			],
			[
				'd9cff7f0ac13d815e792745e155e5d10',
				'Karbon, Granodiorit'
			],
			[
				'd9cff7f0ac13d815e792745e155e5d10',
				'Karbon, Diorit'
			],
			[
				'7915424589c63216f0e55e479b05ad39',
				'Kambrium-Silur, Orthogneis'
			],
			[
				'659b76a514d9599794efaac60010074e',
				'Kambrium-Ordovizium, Granodiorit, Meta-Granodiorit'
			],
			[
				'659b76a514d9599794efaac60010074e',
				'Neoproterozoikum, Meta-Granit'
			],
			[
				'659b76a514d9599794efaac60010074e',
				'Neoproterozoikum, Meta-Granodiorit '
			],
			[
				'7c11241bec38ea077a73cd81859fb171',
				'Proterozoikum-Ordovizium, Gabbro, Meta-Gabbro'
			]
		]
	},
	{
		'layerId': 1,
		'name': '地質境界・構造線（原語：ドイツ語）',
		'items': [
			[
				'c91ea2e17403d08eac23bc4cda91312c',
				'Schichtgrenze'
			],
			[
				'e1a698d90af7fcafdab387d066425779',
				'Schichtgrenze, nicht dargestellt'
			],
			[
				'66969f72bc828e22c7b30688fc168c55',
				'Tektonische Grenze'
			],
			[
				'f7d87cb957bc8663153b1e89a3d0baed',
				'Tektonische Grenze, vermutet'
			],
			[
				'66969f72bc828e22c7b30688fc168c55',
				'Überschiebung'
			],
			[
				'f7d87cb957bc8663153b1e89a3d0baed',
				'Überschiebung, vermutet'
			],
			[
				'66969f72bc828e22c7b30688fc168c55',
				'Abschiebung'
			],
			[
				'707feac8785b96700cfef0aeac7fad08',
				'Tuffgrenze'
			],
			[
				'43099396ef4489a277031cb9dc083f7f',
				'Küstenlinie'
			],
			[
				'43099396ef4489a277031cb9dc083f7f',
				'See'
			],
			[
				'1406b1aeb393b9758d25d5c717d944d2',
				'Blattrand'
			]
		]
	},
	{
		'layerId': 0,
		'name': '変成岩の記号（原語：ドイツ語）',
		'items': [
			[
				'5a0f0bd3f371324254316d293c5c6701',
				'Amphibolit'
			],
			[
				'101e5d798715d6128cfc893cc0863f64',
				'Diatexit, Migmatit'
			],
			[
				'2784da0274f96a65e2cccfaf264c809b',
				'Eklogit'
			],
			[
				'faed435672424f2c7a2b819b752025ab',
				'Glimmerschiefer'
			],
			[
				'c3136b37486ba54ed766bc2b3861457f',
				'Granulit'
			],
			[
				'80954d3314f04ed25987b11e4acfd041',
				'Hornblende-Bändergneis'
			],
			[
				'09556929f67bb4241871c8e7a5f819ba',
				'Marmor'
			],
			[
				'9c84af63cd89dd2d29db761790492838',
				'Meta-Granitoid'
			],
			[
				'a5a82e79949866a261cf67ec107655e0',
				'Mylonit'
			],
			[
				'a556727a728dc22553bd34e3e06420a5',
				'Orthogneis'
			],
			[
				'a5a82e79949866a261cf67ec107655e0',
				'Paragneis'
			],
			[
				'3b54ca17f6c6db6f44b8635a4b3dc1d2',
				'Phyllit'
			]
		]
	},
	{
		'layerId': 2,
		'name': '氷床の縁（原語：ドイツ語）',
		'items': [
			[
				'a5a82e79949866a261cf67ec107655e0',
				'Eisrandlage'
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
