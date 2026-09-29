import type { ImageLegend } from '$routes/map/data/types/raster';

// BGR公式の個別記号画像と原語ラベル。画像は配信元を直接参照する。
// https://services.bgr.de/arcgis/rest/services/geologie/guek250/MapServer/legend?f=pjson
const SERVICE_URL = 'https://services.bgr.de/arcgis/rest/services/geologie/guek250/MapServer';

const groups = [
	{
		'layerId': 5,
		'name': '地質年代・基本層（原語：ドイツ語）',
		'items': [
			[
				'18103537838c1b19d8e27c71c96b1b38',
				'Q - Quartär'
			],
			[
				'9b7d8adf32a00564e7cfe2cd3ff27f0b',
				'Q2 - Holozän'
			],
			[
				'9b7d8adf32a00564e7cfe2cd3ff27f0b',
				'Q2M - Meghalayium'
			],
			[
				'9b7d8adf32a00564e7cfe2cd3ff27f0b',
				'Q2G-Q2N - Grönlandium bis Northgrippium'
			],
			[
				'460589da5df58f85e01478694291ff59',
				'Q1 - Pleistozän'
			],
			[
				'460589da5df58f85e01478694291ff59',
				'Q1-Q2 - Pleistozän bis Holozän'
			],
			[
				'3db3caeccdd36c86f6f8919095729e21',
				'Q1o - Oberpleistozän ("Tarantium")'
			],
			[
				'3db3caeccdd36c86f6f8919095729e21',
				'Q1o-Q2 - Oberpleistozän ("Tarantium") bis Holozän'
			],
			[
				'3db3caeccdd36c86f6f8919095729e21',
				'Q1oW - Weichsel'
			],
			[
				'3db3caeccdd36c86f6f8919095729e21',
				'Q1oW-Q2 - Weichsel bis Holozän'
			],
			[
				'3db3caeccdd36c86f6f8919095729e21',
				'Q1oE - Eem'
			],
			[
				'3db3caeccdd36c86f6f8919095729e21',
				'Q1oE-Q1oW - Eem bis Weichsel'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1m - Mittelpleistozän ("Ionium")'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1m-Q2 - Mittelpleistozän ("Ionium") bis Holozän'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1mS - Saale-Komplex'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1mS-Q1oW - Saale-Komplex bis Weichsel'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1mH - Holstein'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1mE - Elster'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1mE-Q1mS - Elster bis Saale-Komplex'
			],
			[
				'2116bb05d14b5728889026c0820c37dd',
				'Q1mC - Cromer-Komplex'
			],
			[
				'2116bb05d14b5728889026c0820c37dd',
				'Q1mC-Q1mE - Cromer-Komplex bis Elster'
			],
			[
				'2116bb05d14b5728889026c0820c37dd',
				'Q1C - Calabrium'
			],
			[
				'2116bb05d14b5728889026c0820c37dd',
				'Q1C-Q1m - Calabrium bis Mittelpleistozän ("Ionium")'
			],
			[
				'2116bb05d14b5728889026c0820c37dd',
				'Q1CB-Q1mC - Bavel-Komplex bis Cromer-Komplex'
			],
			[
				'2116bb05d14b5728889026c0820c37dd',
				'Q1CM - Menap-Komplex'
			],
			[
				'2116bb05d14b5728889026c0820c37dd',
				'Q1CM-Q1CB - Menap-Komplex bis Bavel-Komplex'
			],
			[
				'e0aefac3947465d2736a30de079adfc5',
				'Q1CE - Eburon-Komplex'
			],
			[
				'e0aefac3947465d2736a30de079adfc5',
				'Q1CE-Q1CM - Eburon-Komplex bis Menap-Komplex'
			],
			[
				'e0aefac3947465d2736a30de079adfc5',
				'Q1G-Q1C - Gelasium bis Calabrium'
			],
			[
				'e0aefac3947465d2736a30de079adfc5',
				'Q1G-Q1m - Gelasium bis Mittelpleistozän ("Ionium")'
			],
			[
				'e0aefac3947465d2736a30de079adfc5',
				'Q1GT - Tegelen-Komplex'
			],
			[
				'e0aefac3947465d2736a30de079adfc5',
				'Q1GP - Prätegelen-Komplex'
			],
			[
				'e0aefac3947465d2736a30de079adfc5',
				'Q1GP-Q1C - Prätegelen-Komplex bis Elster'
			],
			[
				'e0aefac3947465d2736a30de079adfc5',
				'Q1GP-Q1CE - Prätegelen-Komplex bis Eburon-Komplex'
			],
			[
				'90ba004874d8846ed3eca8d1178fbf8b',
				'B - Tertiär'
			],
			[
				'90ba004874d8846ed3eca8d1178fbf8b',
				'B-Q - Tertiär bis Quartär'
			],
			[
				'90ba004874d8846ed3eca8d1178fbf8b',
				'B-Q1 - Tertiär bis Pleistozän'
			],
			[
				'41e9123f985da6c603a9cfd208615910',
				'N - Neogen'
			],
			[
				'e1262afb13c73c1d0084750699d1adc8',
				'N2 - Pliozän'
			],
			[
				'e1262afb13c73c1d0084750699d1adc8',
				'N2-Q1 - Pliozän bis Pleistozän'
			],
			[
				'aac37bdcefeca7015d17019d63978564',
				'N2P - Piacenzium'
			],
			[
				'59be8f8aeaaf2c3960f896fa0842842e',
				'N1 - Miozän'
			],
			[
				'59be8f8aeaaf2c3960f896fa0842842e',
				'N1-N2 - Miozän bis Pliozän'
			],
			[
				'3f58a738081eb8d4d3373036f673d070',
				'N1M-N2P - Messinium bis Piacenzium'
			],
			[
				'fa62b75b5784c3690eafcf2931338d38',
				'N1T - Tortonium'
			],
			[
				'fa62b75b5784c3690eafcf2931338d38',
				'N1T-Q1C - Tortonium bis Calabrium'
			],
			[
				'fa62b75b5784c3690eafcf2931338d38',
				'N1T-N2P - Tortonium bis Piacenzium'
			],
			[
				'fa62b75b5784c3690eafcf2931338d38',
				'N1T-N1M - Tortonium bis Messinium'
			],
			[
				'8421e43823daff8c82c6bf8c089aa74e',
				'N1S-N1T - Serravallium bis Tortonium'
			],
			[
				'81ea9d53d3f21b3cc82faeb2669da508',
				'N1L-N1T - Langhium bis Tortonium'
			],
			[
				'81ea9d53d3f21b3cc82faeb2669da508',
				'N1L-N1S - Langhium bis Serravallium'
			],
			[
				'317ea4f0bab1fb1d210c5f13114eb2f8',
				'N1B - Burdigalium'
			],
			[
				'317ea4f0bab1fb1d210c5f13114eb2f8',
				'N1B-N1M - Burdigalium bis Messinium'
			],
			[
				'317ea4f0bab1fb1d210c5f13114eb2f8',
				'N1B-N1T - Burdigalium bis Tortonium'
			],
			[
				'317ea4f0bab1fb1d210c5f13114eb2f8',
				'N1B-N1S - Burdigalium bis Serravallium'
			],
			[
				'317ea4f0bab1fb1d210c5f13114eb2f8',
				'N1B-N1L - Burdigalium bis Langhium'
			],
			[
				'f9a06e7ab1b19a6051a6c9f88215b90e',
				'N1A - Aquitanium'
			],
			[
				'f9a06e7ab1b19a6051a6c9f88215b90e',
				'N1A-N1S - Aquitanium bis Serravallium'
			],
			[
				'f9a06e7ab1b19a6051a6c9f88215b90e',
				'N1A-N1B - Aquitanium bis Burdigalium'
			],
			[
				'90ba004874d8846ed3eca8d1178fbf8b',
				'E - Paläogen'
			],
			[
				'90ba004874d8846ed3eca8d1178fbf8b',
				'E-N - Paläogen bis Neogen'
			],
			[
				'4eed88ab21f07412b83051a4c42201d0',
				'E3 - Oligozän'
			],
			[
				'4eed88ab21f07412b83051a4c42201d0',
				'E3-N1B - Oligozän bis Burdigalium'
			],
			[
				'0ac8c126b14e94f4563da3b30354f89b',
				'E3C - Chattium'
			],
			[
				'0ac8c126b14e94f4563da3b30354f89b',
				'E3C-N1B - Chattium bis Burdigalium'
			],
			[
				'0ac8c126b14e94f4563da3b30354f89b',
				'E3C-N1A - Chattium bis Aquitanium'
			],
			[
				'4aad18e0956955f6c94421c9bfd6e045',
				'E3R - Rupelium'
			],
			[
				'636fb24a38c9b168748f497ae256a39c',
				'E2 - Eozän'
			],
			[
				'636fb24a38c9b168748f497ae256a39c',
				'E2-E3 - Eozän bis Oligozän'
			],
			[
				'636fb24a38c9b168748f497ae256a39c',
				'E2-E3R - Eozän bis Rupelium'
			],
			[
				'ad474dc120f0ca82817cd6bdb57e7227',
				'E2P-N1B - Priabonium bis Burdigalium'
			],
			[
				'ad474dc120f0ca82817cd6bdb57e7227',
				'E2P-E3R - Priabonium bis Rupelium'
			],
			[
				'8f4b30d711d3ecd829348ff857fa0c4d',
				'K - Kreide'
			],
			[
				'ecb1b9aae9239f3320510117f173db6b',
				'K2 - Oberkreide'
			],
			[
				'ecb1b9aae9239f3320510117f173db6b',
				'K2-E2 - Oberkreide bis Eozän'
			],
			[
				'ecb1b9aae9239f3320510117f173db6b',
				'K2-E - Oberkreide bis Paläogen'
			],
			[
				'2df9b9a0848f7ae69760bb6e3a6dbe6f',
				'K2M - Maastrichtium'
			],
			[
				'85213d3dfaef391f28bec54dd7143588',
				'K2Ca - Campanium'
			],
			[
				'85213d3dfaef391f28bec54dd7143588',
				'K2Ca-E1T - Campanium bis Thanetium'
			],
			[
				'85213d3dfaef391f28bec54dd7143588',
				'K2Ca-E1 - Campanium bis Paläozän'
			],
			[
				'3f924fe9938cb543c1635d39c5605104',
				'K2S - Santonium'
			],
			[
				'3f924fe9938cb543c1635d39c5605104',
				'K2S-K2Ca - Santonium bis Campanium'
			],
			[
				'b77721ade90f6ec516975eea7b633532',
				'K2Cc - Coniacium'
			],
			[
				'b77721ade90f6ec516975eea7b633532',
				'K2Cc-K2Ca - Coniacium bis Campanium'
			],
			[
				'b77721ade90f6ec516975eea7b633532',
				'K2Cc-K2S - Coniacium bis Santonium'
			],
			[
				'4e0feb126ad74a9b67a555f2623bf292',
				'K2T - Turonium'
			],
			[
				'4e0feb126ad74a9b67a555f2623bf292',
				'K2T-K2M - Turonium bis Maastrichtium'
			],
			[
				'4e0feb126ad74a9b67a555f2623bf292',
				'K2T-K2Cc - Turonium bis Coniacium'
			],
			[
				'56115b3b6f4e1a8e67df2e584d650de4',
				'K2Cn - Cenomanium'
			],
			[
				'56115b3b6f4e1a8e67df2e584d650de4',
				'K2Cn-K2Cc - Cenomanium bis Coniacium'
			],
			[
				'56115b3b6f4e1a8e67df2e584d650de4',
				'K2Cn-K2T - Cenomanium bis Turonium'
			],
			[
				'56e427a74a9a77e6e6481ff543813f95',
				'K1 - Unterkreide'
			],
			[
				'56e427a74a9a77e6e6481ff543813f95',
				'K1-K2 - Unterkreide bis Oberkreide'
			],
			[
				'2d5cce70ca84bd2c1c3a49aab353aaae',
				'K1Al - Albium'
			],
			[
				'2d5cce70ca84bd2c1c3a49aab353aaae',
				'K1Al-K2S - Albium bis Santonium'
			],
			[
				'2d5cce70ca84bd2c1c3a49aab353aaae',
				'K1Al-K2Cn - Albium bis Cenomanium'
			],
			[
				'59b147fa2e7cf72bfd2cc44e9c3aecc0',
				'K1Ap - Aptium'
			],
			[
				'59b147fa2e7cf72bfd2cc44e9c3aecc0',
				'K1Ap-K2Cc - Aptium bis Coniacium'
			],
			[
				'59b147fa2e7cf72bfd2cc44e9c3aecc0',
				'K1Ap-K1Al - Aptium bis Albium'
			],
			[
				'52abbdcce307452909e8ec0842fc2c5f',
				'K1Ba - Barrêmium'
			],
			[
				'52abbdcce307452909e8ec0842fc2c5f',
				'K1Ba-K1Ap - Barrêmium bis Aptium'
			],
			[
				'0a7d24d1c386e307ea49b13ff8d52c10',
				'K1H - Hauterivium'
			],
			[
				'7ddaace663228dbdef255d0f03c4e99c',
				'K1V - Valanginium'
			],
			[
				'7ddaace663228dbdef255d0f03c4e99c',
				'K1V-K1Al - Valanginium bis Albium'
			],
			[
				'7ddaace663228dbdef255d0f03c4e99c',
				'K1V-K1H - Valanginium bis Hauterivium'
			],
			[
				'4c6d1f56da8ee26be4a50d339a105274',
				'K1Be - Berriasium'
			],
			[
				'4c6d1f56da8ee26be4a50d339a105274',
				'K1Be-K1Ba - Berriasium bis Barrêmium'
			],
			[
				'8c8085468855a3d1ce30c3a17565d685',
				'J - Jura'
			],
			[
				'8c8085468855a3d1ce30c3a17565d685',
				'J-E - Jura bis Paläogen'
			],
			[
				'8c8085468855a3d1ce30c3a17565d685',
				'J-K - Jura bis Kreide'
			],
			[
				'2a17c91d10d3870453f97e6506538e47',
				'J3 - Oberjura'
			],
			[
				'4df40ad2978344f505c8b9b7bdcf02ee',
				'J3T - Tithonium'
			],
			[
				'4df40ad2978344f505c8b9b7bdcf02ee',
				'J3T-K1Be - Tithonium bis Berriasium'
			],
			[
				'2a85b90f6080ca8ecfe66e091b2fa340',
				'J3K - Kimmeridgium'
			],
			[
				'2a85b90f6080ca8ecfe66e091b2fa340',
				'J3K-K1V - Kimmeridgium bis Valanginium'
			],
			[
				'2a85b90f6080ca8ecfe66e091b2fa340',
				'J3K-J3T - Kimmeridgium bis Tithonium'
			],
			[
				'6dfb2962a37ba41be5489fdc9d5dee57',
				'J3O - Oxfordium'
			],
			[
				'6dfb2962a37ba41be5489fdc9d5dee57',
				'J3O-J3K - Oxfordium bis Kimmeridgium'
			],
			[
				'b2102b37651afe41b953fc2e51a57c4c',
				'J2 - Mitteljura'
			],
			[
				'b2102b37651afe41b953fc2e51a57c4c',
				'J2-J3 - Mitteljura bis Oberjura'
			],
			[
				'c7a58d4a2203da2e461c88087d64b141',
				'J2Bj-J3O - Bajocium bis Oxfordium'
			],
			[
				'c7a58d4a2203da2e461c88087d64b141',
				'J2Bj-J2C - Bajocium bis Callovium'
			],
			[
				'c7a58d4a2203da2e461c88087d64b141',
				'J2Bj-J2Bt - Bajocium bis Bathonium'
			],
			[
				'6585fbcc50de914778506685c90e4a87',
				'J2A - Aalenium'
			],
			[
				'6585fbcc50de914778506685c90e4a87',
				'J2A-J3O - Aalenium bis Oxfordium'
			],
			[
				'30dd0486cd8cf95c5c4d955d79bd80f7',
				'J1 - Unterjura'
			],
			[
				'30dd0486cd8cf95c5c4d955d79bd80f7',
				'J1-J2 - Unterjura bis Mitteljura'
			],
			[
				'aa09474d7a364db8804b2f34e5f912a7',
				'J1T - Toarcium'
			],
			[
				'aa09474d7a364db8804b2f34e5f912a7',
				'J1T-J2A - Toarcium bis Aalenium'
			],
			[
				'71146ab351a05866c94d0ebfe9847074',
				'J1P - Pliensbachium'
			],
			[
				'71146ab351a05866c94d0ebfe9847074',
				'J1P-J1T - Pliensbachium bis Toarcium'
			],
			[
				'545359b21dfb94561f5a7ba182e50c27',
				'J1S - Sinemurium'
			],
			[
				'545359b21dfb94561f5a7ba182e50c27',
				'J1S-J1P - Sinemurium bis Pliensbachium'
			],
			[
				'ef726d1765d23c7560214fdb3c858fbf',
				'J1H-J1P - Hettangium bis Pliensbachium'
			],
			[
				'ef726d1765d23c7560214fdb3c858fbf',
				'J1H-J1S - Hettangium bis Sinemurium'
			],
			[
				'137f924c427bdab4ac5fd5e321085c95',
				'T - Trias'
			],
			[
				'48c7e61d2440fcc03abb84d9f74f1b90',
				'T3R - Rhätium'
			],
			[
				'48c7e61d2440fcc03abb84d9f74f1b90',
				'T3R-J1T - Rhätium bis Toarcium'
			],
			[
				'0c6c223daf4bd092b75c6c63db416132',
				'T3N - Norium'
			],
			[
				'0c6c223daf4bd092b75c6c63db416132',
				'T3N-T3R - Norium bis Rhätium'
			],
			[
				'0c6c223daf4bd092b75c6c63db416132',
				'T3N-T3R? - Norium bis Rhätium?'
			],
			[
				'83a0c809c6314744537edd2dae8f27ac',
				'T3K - Karnium'
			],
			[
				'83a0c809c6314744537edd2dae8f27ac',
				'T3K-T3N - Karnium bis Norium'
			],
			[
				'463c4838d73a50e2653309f83e41bc3b',
				'T2 - Mitteltrias'
			],
			[
				'463c4838d73a50e2653309f83e41bc3b',
				'T2-T3 - Mitteltrias bis Obertrias'
			],
			[
				'de036c3af65dad6770de9506326560b3',
				'T2L - Ladinium'
			],
			[
				'de036c3af65dad6770de9506326560b3',
				'T2L-T3R - Ladinium bis Rhätium'
			],
			[
				'de036c3af65dad6770de9506326560b3',
				'T2L-T3N - Ladinium bis Norium'
			],
			[
				'de036c3af65dad6770de9506326560b3',
				'T2L-T3K - Ladinium bis Karnium'
			],
			[
				'69d1f8d8289651e4b8227d13be9202ee',
				'T2A - Anisium'
			],
			[
				'69d1f8d8289651e4b8227d13be9202ee',
				'T2A-T3K - Anisium bis Karnium'
			],
			[
				'b2189e3e4d7549f2402426558e09cc8b',
				'T1 - Untertrias'
			],
			[
				'83ae89fab4be7bd7e7ffbf67372ef94b',
				'T1O - Olenekium'
			],
			[
				'83ae89fab4be7bd7e7ffbf67372ef94b',
				'T1O-T2A - Olenekium bis Anisium'
			],
			[
				'5eac005ad3dbf18a5dac2e7623bf9de3',
				'T1I - Indusium'
			],
			[
				'5eac005ad3dbf18a5dac2e7623bf9de3',
				'T1I-T2A - Indusium bis Anisium'
			],
			[
				'c0a1b16fe09f37c6340cbeafce3e768c',
				'PZ - Paläozoikum'
			],
			[
				'b75128d5e68f2454761b7bed9aa14de7',
				'P - Perm'
			],
			[
				'b75128d5e68f2454761b7bed9aa14de7',
				'P-T1 - Perm bis Untertrias'
			],
			[
				'9f96098a188db4f91bfac36d2cc8f5f8',
				'P3 - Lopingium'
			],
			[
				'b13caa3c6f2c39dcc169e67f7845ceea',
				'P1 - Cisuralium'
			],
			[
				'b13caa3c6f2c39dcc169e67f7845ceea',
				'P1-P2 - Cisuralium bis Guadalupium'
			],
			[
				'006b5c9b895290bb5a5d6d488447667d',
				'P1K - Kungurium'
			],
			[
				'6d16927871874a93c3ee96121b6d023c',
				'P1Ar-P1K - Artinskium bis Kungurium'
			],
			[
				'1d7f3741f9b525ce59f6fa276b57bba7',
				'P1S - Sakmarium'
			],
			[
				'f37cf89ce8df012dcf55ff3975c31e40',
				'P1As - Asselium'
			],
			[
				'f37cf89ce8df012dcf55ff3975c31e40',
				'P1As-P2R - Asselium bis Roadium'
			],
			[
				'f37cf89ce8df012dcf55ff3975c31e40',
				'P1As-P1S - Asselium bis Sakmarium'
			],
			[
				'7c185136d01a11294b0f7c509dbbc702',
				'C - Karbon'
			],
			[
				'7c185136d01a11294b0f7c509dbbc702',
				'C-P - Karbon bis Perm'
			],
			[
				'50bb90013ba74d61994cda31937caf6e',
				'C2 - Pennsylvanium'
			],
			[
				'50bb90013ba74d61994cda31937caf6e',
				'C2-P1 - Pennsylvanium bis Cisuralium'
			],
			[
				'7c746fd3b3364be6621e054ea7cdbfc4',
				'C2G - Gzhelium'
			],
			[
				'7c746fd3b3364be6621e054ea7cdbfc4',
				'C2G-P1As - Gzhelium bis Asselium'
			],
			[
				'a80c293c12b7407fc1c0e9bf922021b9',
				'C2K-C2G - Kasimovium bis Gzhelium'
			],
			[
				'826832b72f10852adff7effce4ad589f',
				'C2M - Moskovium'
			],
			[
				'50bb90013ba74d61994cda31937caf6e',
				'C2B - Bashkirium'
			],
			[
				'50bb90013ba74d61994cda31937caf6e',
				'C2B-C2M - Bashkirium bis Moskovium'
			],
			[
				'f5ab1e8dddd999ebd31c80acf837d88a',
				'C1 - Mississippium'
			],
			[
				'f5ab1e8dddd999ebd31c80acf837d88a',
				'C1-C2 - Mississippium bis Pennsylvanium'
			],
			[
				'1ddb56e50555d365ae4cbee5eead7854',
				'C1S-C2M - Serpukhovium bis Moskovium'
			],
			[
				'1ddb56e50555d365ae4cbee5eead7854',
				'C1S-C2B - Serpukhovium bis Bashkirium'
			],
			[
				'755dadd1e70f8116bce488dfd154c9c3',
				'C1V - Viséum'
			],
			[
				'755dadd1e70f8116bce488dfd154c9c3',
				'C1V-C2G - Viséum bis Gzhelium'
			],
			[
				'755dadd1e70f8116bce488dfd154c9c3',
				'C1V-C2B - Viséum bis Bashkirium'
			],
			[
				'755dadd1e70f8116bce488dfd154c9c3',
				'C1V?-C2B - Viséum? bis Bashkirium'
			],
			[
				'61147911174ef51a575ac2003dda2ecc',
				'C1T - Tournaisium'
			],
			[
				'61147911174ef51a575ac2003dda2ecc',
				'C1T-C2B - Tournaisium bis Bashkirium'
			],
			[
				'61147911174ef51a575ac2003dda2ecc',
				'C1T-C1V - Tournaisium bis Viséum'
			],
			[
				'4ad9a3ca90e18a1a96ce13fdb2e93731',
				'D - Devon'
			],
			[
				'4ad9a3ca90e18a1a96ce13fdb2e93731',
				'D-C1 - Devon bis Mississippium'
			],
			[
				'1b35bf41ef1c67064321ff0fdcd3ae49',
				'D3 - Oberdevon'
			],
			[
				'a5abd77274e99b3d25f47b1ff1a828dc',
				'D3Fm - Famennium'
			],
			[
				'a5abd77274e99b3d25f47b1ff1a828dc',
				'D3Fm-C1T - Famennium bis Tournaisium'
			],
			[
				'2839774ba98d41e752141f340e715a37',
				'D3Fr - Frasnium'
			],
			[
				'2839774ba98d41e752141f340e715a37',
				'D3Fr-C1T - Frasnium bis Tournaisium'
			],
			[
				'55764c1410ef69258614a4ad4cad97be',
				'D2 - Mitteldevon'
			],
			[
				'55764c1410ef69258614a4ad4cad97be',
				'D2-C1 - Mitteldevon bis Mississippium'
			],
			[
				'55764c1410ef69258614a4ad4cad97be',
				'D2-D3 - Mitteldevon bis Oberdevon'
			],
			[
				'9de6868ee488cbf9a70231c7acaca877',
				'D2G - Givetium'
			],
			[
				'9de6868ee488cbf9a70231c7acaca877',
				'D2G-C1V - Givetium bis Viséum'
			],
			[
				'9de6868ee488cbf9a70231c7acaca877',
				'D2G-D3Fm - Givetium bis Famennium'
			],
			[
				'fac485cc03663a55f0965a94c2b124cf',
				'D2E - Eifelium'
			],
			[
				'26cb711564c5fedb113138ff94b3802b',
				'D1 - Unterdevon'
			],
			[
				'26cb711564c5fedb113138ff94b3802b',
				'D1-D2 - Unterdevon bis Mitteldevon'
			],
			[
				'1bbc6609bf8f7ef2799df56e870db92c',
				'D1E - Emsium'
			],
			[
				'1bbc6609bf8f7ef2799df56e870db92c',
				'D1E-D3 - Emsium bis Oberdevon'
			],
			[
				'1bbc6609bf8f7ef2799df56e870db92c',
				'D1E-D2G - Emsium bis Givetium'
			],
			[
				'1bbc6609bf8f7ef2799df56e870db92c',
				'D1E-D2E - Emsium bis Eifelium'
			],
			[
				'34cc7f1c31816e93851fc7c62d6cef04',
				'D1P - Pragium'
			],
			[
				'34cc7f1c31816e93851fc7c62d6cef04',
				'D1P-D1E - Pragium bis Emsium'
			],
			[
				'e96ee6ba9058d7427d85c97627f98b09',
				'D1L - Lochkovium'
			],
			[
				'e96ee6ba9058d7427d85c97627f98b09',
				'D1L-D1P - Lochkovium bis Pragium'
			],
			[
				'3055f7c4ce370c0db32e1d91262677bd',
				'S - Silur'
			],
			[
				'3055f7c4ce370c0db32e1d91262677bd',
				'S-D - Silur bis Devon'
			],
			[
				'3055f7c4ce370c0db32e1d91262677bd',
				'S-D1 - Silur bis Unterdevon'
			],
			[
				'0997ac3e09883897496be89a04864f9f',
				'O - Ordovizium'
			],
			[
				'0997ac3e09883897496be89a04864f9f',
				'O-D - Ordovizium bis Devon'
			],
			[
				'0997ac3e09883897496be89a04864f9f',
				'O-D1 - Ordovizium bis Unterdevon'
			],
			[
				'0997ac3e09883897496be89a04864f9f',
				'O-S - Ordovizium bis Silur'
			],
			[
				'5ee744b0b48e646a1211ca8793331108',
				'O3 - Oberordovizium'
			],
			[
				'5ee744b0b48e646a1211ca8793331108',
				'O3-S - Oberordovizium bis Silur'
			],
			[
				'ecc98a39e3418938c6ea52cef0c28776',
				'O2 - Mittelordovizium'
			],
			[
				'ecc98a39e3418938c6ea52cef0c28776',
				'O2-S - Mittelordovizium bis Silur'
			],
			[
				'ecc98a39e3418938c6ea52cef0c28776',
				'O2-O3 - Mittelordovizium bis Oberordovizium'
			],
			[
				'1fb0161e2a807ec9ebd4d610282802e8',
				'O1 - Unterordovizium'
			],
			[
				'1fb0161e2a807ec9ebd4d610282802e8',
				'O1-O2 - Unterordovizium bis Mittelordivizium'
			],
			[
				'17f4195eb8bf16db5c36e75c3078ac49',
				'O1F-3H - Floium bis Hirnantium'
			],
			[
				'17f4195eb8bf16db5c36e75c3078ac49',
				'O1F-O2D - Floium bis Darriwilium'
			],
			[
				'58d5eba8b0bf42b08e9b6b11134530d5',
				'O1T - Tremadocium'
			],
			[
				'1d54dd2ff04bcd1dcba4d61875f0b98d',
				'Cb - Kambrium'
			],
			[
				'1d54dd2ff04bcd1dcba4d61875f0b98d',
				'Cb-D - Kambrium bis Devon'
			],
			[
				'1d54dd2ff04bcd1dcba4d61875f0b98d',
				'Cb-D3 - Kambrium bis Oberdevon'
			],
			[
				'1d54dd2ff04bcd1dcba4d61875f0b98d',
				'Cb-D3Fr - Kambrium bis Frasnium'
			],
			[
				'1d54dd2ff04bcd1dcba4d61875f0b98d',
				'Cb-S - Kambrium bis Silur'
			],
			[
				'1d54dd2ff04bcd1dcba4d61875f0b98d',
				'Cb-O - Kambrium bis Ordovizium'
			],
			[
				'1be87fcc6ce718688bcec57929fbb585',
				'CbF-O1T - Furongium bis Tremadocium'
			],
			[
				'0466f6e983815a28cbcce5ead803c8f0',
				'Pcb - Präkambrium'
			],
			[
				'0466f6e983815a28cbcce5ead803c8f0',
				'Pcb-S - Präkambrium bis Silur'
			],
			[
				'0466f6e983815a28cbcce5ead803c8f0',
				'Pcb-Cb - Präkambrium bis Kambrium'
			],
			[
				'0466f6e983815a28cbcce5ead803c8f0',
				'Pcb-O - Präkambrium bis Ordovizium'
			],
			[
				'520e1661ad40b0e9144b421922161651',
				'PR - Proterozoikum'
			],
			[
				'520e1661ad40b0e9144b421922161651',
				'PR-PZ - Proterozoikum bis Paläozoikum'
			],
			[
				'81738c400ab4a26a4f1ed53b0d50d8af',
				'NP - Neoproterozoikum'
			],
			[
				'81738c400ab4a26a4f1ed53b0d50d8af',
				'NP-PZ - Neoproterozoikum bis Paläozoikum'
			],
			[
				'81738c400ab4a26a4f1ed53b0d50d8af',
				'NP-S - Neoproterozoikum bis Silur'
			],
			[
				'4bd3dabfc9dd064c3dd50f0bd35247e0',
				'NP3 - Ediacarium'
			],
			[
				'4bd3dabfc9dd064c3dd50f0bd35247e0',
				'NP3-PZ - Ediacarium bis Paläozoikum'
			]
		]
	},
	{
		'layerId': 4,
		'name': '地質年代・被覆層（原語：ドイツ語）',
		'items': [
			[
				'18103537838c1b19d8e27c71c96b1b38',
				'Q - Quartär'
			],
			[
				'9b7d8adf32a00564e7cfe2cd3ff27f0b',
				'Q2 - Holozän'
			],
			[
				'9b7d8adf32a00564e7cfe2cd3ff27f0b',
				'Q2M - Meghalayium'
			],
			[
				'9b7d8adf32a00564e7cfe2cd3ff27f0b',
				'Q2G-Q2N - Grönlandium bis Northgrippium'
			],
			[
				'460589da5df58f85e01478694291ff59',
				'Q1 - Pleistozän'
			],
			[
				'460589da5df58f85e01478694291ff59',
				'Q1-Q2 - Pleistozän bis Holozän'
			],
			[
				'3db3caeccdd36c86f6f8919095729e21',
				'Q1o - Oberpleistozän ("Tarantium")'
			],
			[
				'3db3caeccdd36c86f6f8919095729e21',
				'Q1oW - Weichsel'
			],
			[
				'3db3caeccdd36c86f6f8919095729e21',
				'Q1oW-Q2 - Weichsel bis Holozän'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1m - Mittelpleistozän ("Ionium")'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1mS - Saale-Komplex'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1mS-Q2 - Saale-Komplex bis Holozän'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1mE - Elster'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1mE-Q2 - Elster bis Holozän'
			],
			[
				'1338a8303252de9a98952518ae9ab0d5',
				'Q1mE-Q1mS - Elster bis Saale-Komplex'
			],
			[
				'2116bb05d14b5728889026c0820c37dd',
				'Q1mC-Q1mE - Cromer-Komplex bis Elster'
			],
			[
				'2116bb05d14b5728889026c0820c37dd',
				'Q1C - Calabrium'
			],
			[
				'e0aefac3947465d2736a30de079adfc5',
				'Q1GP-Q1C - Prätegelen-Komplex bis Elster'
			],
			[
				'e1262afb13c73c1d0084750699d1adc8',
				'N2-Q1 - Pliozän bis Pleistozän'
			],
			[
				'636fb24a38c9b168748f497ae256a39c',
				'E2 - Eozän'
			],
			[
				'c0a1b16fe09f37c6340cbeafce3e768c',
				'PZ - Paläozoikum'
			]
		]
	},
	{
		'layerId': 0,
		'name': '断層などの地質構造（原語：ドイツ語）',
		'items': [
			[
				'66969f72bc828e22c7b30688fc168c55',
				'Tektonische Grenze'
			],
			[
				'29786670cd40389cf1fcfb5dc016eea4',
				'Tektonische Grenze mit Richtung des Einfallens'
			],
			[
				'67ee4fb3d50f6d242fb309199ed8ba63',
				'Tektonische Grenze unter Bedeckung'
			],
			[
				'6ce4250ea50ebb21f89bfdf0137da87b',
				'Tektonische Grenze, vermutet'
			],
			[
				'6397b565ea6c90f9a7f620b77256d145',
				'Überschiebung, nachgewiesen'
			],
			[
				'a2220670e06bf8aaac6587989ba00e83',
				'Überschiebung, vermutet'
			],
			[
				'ad45ad21a7d55f7ecbc848e2547a7db4',
				'Flexur'
			],
			[
				'66969f72bc828e22c7b30688fc168c55',
				'Hauptdeckengrenze'
			],
			[
				'93d9e0799f1504dd8d3ca43db4315aff',
				'Deckengrenze'
			]
		]
	},
	{
		'layerId': 1,
		'name': '石英脈（原語：ドイツ語）',
		'items': [
			[
				'e59da7d0eb8ef67a6580b757e1f2d683',
				'Quarzgang'
			]
		]
	},
	{
		'layerId': 2,
		'name': '氷床の縁・モレーン（原語：ドイツ語）',
		'items': [
			[
				'bc580e3ab180550b6a907afebf512ba3',
				'Eisrandlagen'
			],
			[
				'f58b0ac2db0b03a20c7f327c3a908b07',
				'Eisrandlagen, Endmoränen-Streichrichtung, Wallform'
			],
			[
				'bc580e3ab180550b6a907afebf512ba3',
				'Schuppenzonen'
			],
			[
				'9d6f4d42b37353b11113817124420d7d',
				'Stauchzonen'
			],
			[
				'bc580e3ab180550b6a907afebf512ba3',
				'Vereisungsgrenze der Elster-Kaltzeit'
			],
			[
				'bc580e3ab180550b6a907afebf512ba3',
				'Vereisungsgrenze der Saale-Kaltzeit'
			],
			[
				'9d6f4d42b37353b11113817124420d7d',
				'Vereisungsgrenze der Weichsel-Kaltzeit'
			]
		]
	}
] as const;

const legend: ImageLegend = {
	type: 'image',
	layout: 'symbols',
	categories: groups.map(({ layerId, name, items }) => ({
		name,
		urls: items.map(([image]) => `${SERVICE_URL}/${layerId}/images/${image}`),
		labels: items.map(([, label]) => label)
	}))
};

export default legend;
