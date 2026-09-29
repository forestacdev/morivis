import { LEGEND_DATA_PATH } from '$routes/constants';
import type { ImageLegend } from '$routes/map/data/types/raster';

// 記号画像と原語ラベルの対応。提供元: https://gis.geosphere.at/maps/rest/services/geologie/nied_200/MapServer/legend?f=pjson
const IMG = LEGEND_DATA_PATH + '/geosphere_lower_austria_geology';
const groups = [
	{
		'name': '岩石・地層・水域（原語：ドイツ語）',
		'items': [
			[
				'planar-000.webp',
				'1 - Anthropogene Ablagerung (Deponie, Bergbauhalde, etc.)'
			],
			[
				'planar-001.webp',
				'2 - Talfüllung - Jüngster Talboden (Kies, Auelehm)'
			],
			[
				'planar-002.webp',
				'3 - Schwemmfächer'
			],
			[
				'planar-003.webp',
				'4 - Trockental'
			],
			[
				'planar-004.webp',
				'5 - Vernässung, Moor'
			],
			[
				'planar-005.webp',
				'6 - Seeton, limnisches Sediment'
			],
			[
				'planar-006.webp',
				'7 - Hangschutt'
			],
			[
				'planar-007.webp',
				'8 - Bergsturzmaterial, Blockwerk'
			],
			[
				'planar-008.webp',
				'9 - Talfüllung - Älterer Talboden (Kies, Sand)'
			],
			[
				'planar-009.webp',
				'10 - Rutschhang, Massenbewegung, Sackungsmasse'
			],
			[
				'planar-010.webp',
				'11 - Fluviatile Ablagerungen i.A. (Kies, Sand)'
			],
			[
				'planar-011.webp',
				'12 - Fluviatile Ablagerung im Neusiedlerseegebiet, z.T. mit äolischen Deckschichten; Oberes Pleistozän (Kies, Sand, Flugsand)'
			],
			[
				'planar-012.webp',
				'13 - Quartärer Kies und Sand i.A.'
			],
			[
				'planar-013.webp',
				'14 - Lehm, Verwitterungslehm, Hanglehm'
			],
			[
				'planar-014.webp',
				'15 - Lehm, Löss, undifferenziert'
			],
			[
				'planar-015.webp',
				'16 - Flugsand'
			],
			[
				'planar-016.webp',
				'17 - Jüngerer Flugsand; Holozän'
			],
			[
				'planar-017.webp',
				'18 - Älterer Flugsand; Pleistozän'
			],
			[
				'planar-018.webp',
				'19 - Löss, Lösslehm'
			],
			[
				'planar-019.webp',
				'20 - Schuttkomplex des Mitterriegels und Äquivalente'
			],
			[
				'planar-020.webp',
				'21 - Hangbrekzie i.A.'
			],
			[
				'planar-021.webp',
				'22 - Hangbrekzie; ?Mindel-Riss-Interglazial'
			],
			[
				'planar-022.webp',
				'23 - Blockgletscher (Blockwerk)'
			],
			[
				'planar-023.webp',
				'24 - Terrassensedimente i.A. (Kies, Sand)'
			],
			[
				'planar-024.webp',
				'25 - Tiefere Terrassensedimente i.A.'
			],
			[
				'planar-025.webp',
				'26 - Höhere Terrassensedimente i.A.'
			],
			[
				'planar-026.webp',
				'27 - Schwemmfächer im Bereich der Kleinen Karpaten'
			],
			[
				'planar-027.webp',
				'28 - Hochgelegene Terrassensedimente; Oberes Pliozän (Kies und Sand, z.T. verfestigt)'
			],
			[
				'planar-028.webp',
				'29 - Terrassensedimente im Kamptal und Thayatal (Kies, Sand)'
			],
			[
				'planar-029.webp',
				'30 - Tiefere Terrassensedimente; Oberes Pleistozän (Kies, Sand)'
			],
			[
				'planar-030.webp',
				'31 - Mittlere Terrassensedimente; Mittleres Pleistozän (Kies, Sand)'
			],
			[
				'planar-031.webp',
				'32 - Höhere Terrassensedimente; Unteres Pleistozän (Kies, Sand)'
			],
			[
				'planar-032.webp',
				'33 - Fluvio-lakustrine Ablagerung in Tschechien (Kies, Sand, Ton)'
			],
			[
				'planar-033.webp',
				'34 - Hochgelegene Terrassensedimente an der Thaya und im Weinviertel; Oberes Pliozän - Pleistozän (Kies, Sand, z.T. verfestigt)'
			],
			[
				'planar-034.webp',
				'35 - Niederterrasse (Kies, Sand)'
			],
			[
				'planar-035.webp',
				'36 - Seewinkelschotter (Kies)'
			],
			[
				'planar-036.webp',
				'37 - Steinfeldschotter; Riss - Würm (Kies, Grobsand)'
			],
			[
				'planar-037.webp',
				'38 - Hochterrasse (lokal tektonisch abgesenkt), meistens mit Deckschichten von Löss und Lehm; Riss (Kies, Sand)'
			],
			[
				'planar-038.webp',
				'39 - Jüngerer Deckenschotter i.A., meistens mit Deckschichten von Löss und Lehm'
			],
			[
				'planar-039.webp',
				'40 - Jüngerer Deckenschotter (tieferes Niveau), meistens mit Deckschichten von Löss und Lehm'
			],
			[
				'planar-040.webp',
				'41 - Jüngerer Deckenschotter (höheres Niveau), meistens mit Deckschichten von Löss und Lehm'
			],
			[
				'planar-041.webp',
				'42 - Älterer Deckenschotter, meistens mit Deckschichten von Löss und Lehm; Günz'
			],
			[
				'planar-042.webp',
				'43 - Plio-Pleistozäne Schotter in verschiedenen Höhenlagen, meistens mit Deckschichten von Löss und Lehm, westl. Amstetten z.T. nur Verebnungsniveaus'
			],
			[
				'planar-043.webp',
				'44 - Steinbrunner Schotter, Zillingdorfer Schotter (Kies, Sand)'
			],
			[
				'planar-044.webp',
				'45 - Tiefere Terrassensedimente im Donauraum östlich der kleinen Karpaten; Pleistozän - Holozän (Kies, Sand)'
			],
			[
				'planar-045.webp',
				'46 - Fluviatile Ablagerung; Würm (Kies, Sand)'
			],
			[
				'planar-046.webp',
				'47 - Fluviatile Ablagerung (Kies, Sand), z.T. mit Deckschichten aus Löss und Lehm; Mittleres Pleistozän'
			],
			[
				'planar-047.webp',
				'48 - Fluviatile Ablagerung (Kies, Sand), z.T. mit Deckschichten aus Löss und Lehm; Unteres bis Mittleres Pleistozän'
			],
			[
				'planar-048.webp',
				'49 - Fluviatile Ablagerung (Kies, Sand), z.T. mit Deckschichten aus Löss und Lehm; Unteres Pleistozän'
			],
			[
				'planar-049.webp',
				'50 - Moräne (Gemenge von Ton bis Blockwerk)'
			],
			[
				'planar-050.webp',
				'51 - Eisrandterrasse (Kies, Sand, Bänderschluff)'
			],
			[
				'planar-051.webp',
				'52 - Moräne (Gemenge von Ton bis Blockwerk)'
			],
			[
				'planar-052.webp',
				'53 - Eisrandterrasse (Kies, Sand, Bänderschluff)'
			],
			[
				'planar-053.webp',
				'100 - Ledenice-Formation; Pliozän (Ton, Sand)'
			],
			[
				'planar-054.webp',
				'101 - Korosecke-Sand und -Schotter; Mittel-Miozän (Sand, Kies mit Moldaviten)'
			],
			[
				'planar-055.webp',
				'102 - Domanin-Formation; Badenium - Sarmatium (Ton, Kohleton, Kies)'
			],
			[
				'planar-056.webp',
				'103 - Mydlovary-Formation; Badenium (Sandstein, Ton, Kohle, Diatomit)'
			],
			[
				'planar-057.webp',
				'104 - Zliv-Formation; Ottnangium - Karpatium (Ton, Sandstein, Konglomerat)'
			],
			[
				'planar-058.webp',
				'105 - Lipnice-Formation; Oligozän (Kies, Sand, Sandstein, Ton)'
			],
			[
				'planar-059.webp',
				'106 - Kies (Tschechien); Pliozän'
			],
			[
				'planar-060.webp',
				'107 - Irnfritz-Radessen-Formation (Kies, Sand, tonreich)'
			],
			[
				'planar-061.webp',
				'108 - Kies und Sand i.A.'
			],
			[
				'planar-062.webp',
				'109 - Ton und Sand i.A.'
			],
			[
				'planar-063.webp',
				'110 - Sedimente von Laimbach-Trandorf (Kies, Sand, Schluff)'
			],
			[
				'planar-064.webp',
				'111 - Hollabrunn-Mistelbach-Formation (auch im nördl. Wiener Becken) (Kies, Sand, Schluff)'
			],
			[
				'planar-065.webp',
				'112 - Ziersdorf-Formation und Äquivalente; Sarmatium (Ton, Schluff, Mergel, Sand, Kies)'
			],
			[
				'planar-066.webp',
				'113 - Tonmergel (Tegel)'
			],
			[
				'planar-067.webp',
				'114 - Sand, Kies'
			],
			[
				'planar-068.webp',
				'115 - Hollenburg-Karlstetten-Formation, Sedimente des Badenium in der Kremser Bucht und der Wachau (Konglomerat, Mergel, Sand)'
			],
			[
				'planar-069.webp',
				'116 - Grund-Formation, Gaindorf-Formation, Mailberg-Formation (Mergel, Sand, Kalkstein)'
			],
			[
				'planar-070.webp',
				'117 - Laa-Formation, Flyschkonglomerat vom Haberg; Karpatium (Mergel, Mergelstein, Blockwerk aus Sandstein)'
			],
			[
				'planar-071.webp',
				'118 - Theras-Formation, Brennholz-Formation (Sand, Kies, Quarzitschutt)'
			],
			[
				'planar-072.webp',
				'119 - Langau-Formation, Riegersburg-Formation (Ton, Schluff, Sand, Braunkohle, Glimmersand)'
			],
			[
				'planar-073.webp',
				'120 - Oncophora-Schichten (Schluff, Sand)'
			],
			[
				'planar-074.webp',
				'121 - Eichberg-Konglomerat (Konglomerat und Blockwerk aus Sandstein)'
			],
			[
				'planar-075.webp',
				'122 - Plesching-Formation (Sand, Mergel z.T. mit Phosphoritknollen)'
			],
			[
				'planar-076.webp',
				'123 - Robulus-Schlier (Mergel, Sand- und Sandsteinlagen)'
			],
			[
				'planar-077.webp',
				'124 - Mauer-Formation (Kristallinblockwerk, Sand, Mergel)'
			],
			[
				'planar-078.webp',
				'125 - Prinzersdorfer Sande (Sand, Mergel)'
			],
			[
				'planar-079.webp',
				'126 - Blockmergel und Blocksande von Königstetten, Blockschichten vom Heuberg (Mergel und Sand mit Blockwerk aus Kristallin und Sandstein)'
			],
			[
				'planar-080.webp',
				'127 - Sandstreifenschlier (Mergel, Sand und Sandsteinlagen)'
			],
			[
				'planar-081.webp',
				'128 - Zellerndorf-Formation, Limberg-Subformation, Weitersfeld-Formation, Sedimente des Eggenburgium - Ottnangium i.A. in Tschechien (Ton, Diatomit)'
			],
			[
				'planar-082.webp',
				'129 - Zogelsdorf-Formation, Retz-Formation, Sedimente des Eggenburgium i.A. (Tschechien) (Kalksandstein, Sand)'
			],
			[
				'planar-083.webp',
				'130 - Gauderndorf-Formation, Burgschleinitz-Formation, Kühnring-Subformation (Feinsand, Grob- bis Feinsand, Ton, Schluff, Sand)'
			],
			[
				'planar-084.webp',
				'131 - Loibersdorf-Formation (Grob- bis Feinsand)'
			],
			[
				'planar-085.webp',
				'132 - Mold-Formation (Ton, Schluff)'
			],
			[
				'planar-086.webp',
				'133 - Fels-Formation (Grob- bis Feinsand)'
			],
			[
				'planar-087.webp',
				'134 - Haller Schlier und Äquivalente (Mergel, Sand und Sandstein)'
			],
			[
				'planar-088.webp',
				'135 - Buchberg-Konglomerat (Konglomerat und Blockwerk aus Sandstein)'
			],
			[
				'planar-089.webp',
				'136 - Sedimente des Egerium i.A.'
			],
			[
				'planar-090.webp',
				'137 - Älterer Schlier (Ton, Schluff, Mergel, braun und schwarz)'
			],
			[
				'planar-091.webp',
				'138 - Ollersbach-Konglomerat (Konglomerat und Blockwerk aus Kristallin, Quarz, Sandstein)'
			],
			[
				'planar-092.webp',
				'139 - Melker Sand, Linzer Sand, Sandstein von Wallsee und Perg (Grob- bis Feinsand, Kies, Sandstein)'
			],
			[
				'planar-093.webp',
				'140 - Pielacher Tegel; Kiscellium - Egerium (Ton, Schluff, toniger Sand)'
			],
			[
				'planar-094.webp',
				'141 - Sedimente von Freistadt-Kefermarkt, einschließlich Vorkommen in Tschechien (Kies, Sand, Schluff)'
			],
			[
				'planar-095.webp',
				'142 - St. Marein-Freischling-Formation (Kies, Sand, Schluff)'
			],
			[
				'planar-096.webp',
				'143 - Sedimente der Subalpinen Molasse zwischen Enns und Mank; Egerium - Eggenburgium (Mergel, Sand, Sandstein)'
			],
			[
				'planar-097.webp',
				'144 - Rogatsboden-Formation und Äquivalente (z.B. Wolfsgraben-Formation); Oberes Eozän - Oligozän (Tonmergel, Sandsteinlagen)'
			],
			[
				'planar-098.webp',
				'145 - Eisenschüssige Tone und Sande (WZ), Krepice-Formation (PE), Pavlovice-Formation (SE); Oberes Eggenburgium - Ottnangium (Schluff, Sand, Kies, Ton mit Eisenooidkalk, Diatomit)'
			],
			[
				'planar-099.webp',
				'146 - Sakvice-Formation, Uvaly-Formation (SE); Eggenburgium, Ottnangium (Tonmergel)'
			],
			[
				'planar-100.webp',
				'147 - Schieferige Tonmergel (WZ); Eggenburgium - Ottnangium, Zdanice-Hustopece-Formation (SE); Egerium (Ton, Tonmergel, Sand, Sandstein)'
			],
			[
				'planar-101.webp',
				'148 - Blockschichten in Schieferige Tonmergel und Zdanice-Hustopece-Formation (Blöcke aus Sandstein, Mergelstein, Granit, Gneis)'
			],
			[
				'planar-102.webp',
				'149 - Michelstetten-Formation (WZ), Boudky-Formation (PE); Egerium - Eggenburgium (Mergel, Ton)'
			],
			[
				'planar-103.webp',
				'150 - Thomasl-Formation, Ottenthal-Formation (WZ), Pouzdrany-Formation (PE), Menilith-Schichten, Nemcice-Formation (SE); Priabonium - Unteres Egerium (Tonmergel, Tonstein, Sand, Diatomit)'
			],
			[
				'planar-104.webp',
				'151 - Reingrub-Formation, Niederhollabrunner Kalk (Hollingsteinkalk, Pfaffenholzschichten); Priabonium (Sand, Sandstein, Kalkstein)'
			],
			[
				'planar-105.webp',
				'152 - Haidhof-Formation; Lutetium (Sandstein, Kalkstein mit Bohnerz)'
			],
			[
				'planar-106.webp',
				'153 - Waschberg-Formation; Ypresium - Lutetium (Kalkstein)'
			],
			[
				'planar-107.webp',
				'154 - Bruderndorf-Formation, Zaya-Formation; Danium - Thanetium (Mergel, Sandstein, Glaukonitsandstein)'
			],
			[
				'planar-108.webp',
				'155 - Mucronaten-Schichten (WZ), Palava-Formation (SE); Maastrichtium - Campanium (glaukonitischer Tonmergel, Sand, Sandstein)'
			],
			[
				'planar-109.webp',
				'156 - Klement-Formation; Oberes Turonium - Santonium (glaukonitischer Sandstein, Tonstein, Mergelkalk)'
			],
			[
				'planar-110.webp',
				'157 - Ernstbrunn-Formation; Tithonium (organodetritischer Kalkstein)'
			],
			[
				'planar-111.webp',
				'158 - Klentnitz-Formation; Oxfordium - Tithonium (Mergelkalk)'
			],
			[
				'planar-112.webp',
				'200 - Blockschotter, Blockkonglomerat, Kies (u.a. Würflacher Blockschotter); Pliozän'
			],
			[
				'planar-113.webp',
				'201 - Bunte Lehmserie (nördliches Wiener Becken); Unteres Pliozän (Lehm, rötlich, Kies, Blockwerk)'
			],
			[
				'planar-114.webp',
				'202 - Loipersbach-Formation (südliches Wiener Becken); Unteres Pliozän (Lehm, rötlich, Kies, Blockwerk)'
			],
			[
				'planar-115.webp',
				'203 - Rohrbach- und Ternitz-Formation; Unteres Pliozän (Konglomerat)'
			],
			[
				'planar-116.webp',
				'204 - Tihany-Formation; Oberes Pannonium - Pliozän (Ton, Sand)'
			],
			[
				'planar-117.webp',
				'205 - Sedimente des Pannonium i.A.'
			],
			[
				'planar-118.webp',
				'206 - Inzersdorfer Tegel, Congerientegel'
			],
			[
				'planar-119.webp',
				'207 - Sand, Sandstein, Mehlsand'
			],
			[
				'planar-120.webp',
				'208 - Kies'
			],
			[
				'planar-121.webp',
				'209 - Leobersdorf-Formation; Unteres Pannonium (mergeliger Sand, Feinsand, Kies)'
			],
			[
				'planar-122.webp',
				'210 - Ton, Sand, Kies, lokal Lignit und Süßwasserkalk - Gbely-Formation i.d. Slowakei'
			],
			[
				'planar-123.webp',
				'211 - Neufeld-Formation, Dubnany-Formation; Oberes Pannonium (Sand, Kies, Ton, Braunkohle)'
			],
			[
				'planar-124.webp',
				'212 - Ivanka-Formation (Donau-Becken - Sand, Ton, z.T. Konglomerat, Mergel); Zahorie-Formation (Wiener Becken - Ton, Sand)'
			],
			[
				'planar-125.webp',
				'213 - Kapfensteiner Schotter'
			],
			[
				'planar-126.webp',
				'214 - Triesting- und Piesting-Schotter; Unteres Pannonium'
			],
			[
				'planar-127.webp',
				'215 - Basalt von Oberpullendorf, Pauliberg (basischer Vulkanismus); Pannonium - Sarmatium'
			],
			[
				'planar-128.webp',
				'216 - Sedimente des Sarmatium i.A.'
			],
			[
				'planar-129.webp',
				'217 - Ton vorwiegend'
			],
			[
				'planar-130.webp',
				'218 - Sand vorwiegend'
			],
			[
				'planar-131.webp',
				'219 - Kies vorwiegend'
			],
			[
				'planar-132.webp',
				'220 - Detritärer Leithakalk'
			],
			[
				'planar-133.webp',
				'221 - Holic-Formation (Mergel, Sand); Skalica-Formation (Mergel)'
			],
			[
				'planar-134.webp',
				'222 - Sedimente des Badenium i.A.'
			],
			[
				'planar-135.webp',
				'223 - Ton vorwiegend'
			],
			[
				'planar-136.webp',
				'224 - Sand vorwiegend'
			],
			[
				'planar-137.webp',
				'225 - Kies vorwiegend, Bannholzschotter'
			],
			[
				'planar-138.webp',
				'226 - Brekzie (u.a. Gainfarner Brekzie)'
			],
			[
				'planar-139.webp',
				'227 - Leithakalk, Süßwasserkalk von Ameis'
			],
			[
				'planar-140.webp',
				'228 - Blockschotter'
			],
			[
				'planar-141.webp',
				'229 - Sedimente des Karpatium i.A.'
			],
			[
				'planar-142.webp',
				'230 - Korneuburg-Formation (Tonmergel, Feinsand)'
			],
			[
				'planar-143.webp',
				'231 - Brennberger Blockstrom (Kristallinblockwerk in sandig-lehmigem Bindemittel)'
			],
			[
				'planar-144.webp',
				'232 - Sinnersdorf-Formation (Blockwerk, Konglomerat, Tufflagen)'
			],
			[
				'planar-145.webp',
				'233 - Rust-Formation (Sand, Kies)'
			],
			[
				'planar-146.webp',
				'234 - Hochriegel-Formation (Sand, Ton)'
			],
			[
				'planar-147.webp',
				'235 - Kohleführende Süßwasserschichten (Kies, stark verlehmt, Ton, Braunkohle)'
			],
			[
				'planar-148.webp',
				'236 - Neogen von Hieflau; ?Karpatium (Mergel, Sandstein, Konglomerat, Kohleflöze)'
			],
			[
				'planar-149.webp',
				'237 - Neogen der Norischen Senke (Krieglach, St. Kathrein, Aflenz); ?Ottnangium - Karpatium (Kies, stark verlehmt, Ton, Braunkohle)'
			],
			[
				'planar-150.webp',
				'238 - Oberer Auwaldschotter (Kies aus Grauwackenzone und Kalkalpen)'
			],
			[
				'planar-151.webp',
				'239 - Unterer Auwaldschotter (Kies aus Kristallinkomponenten)'
			],
			[
				'planar-152.webp',
				'240 - Neogen von Kirchberg am Wechsel (Blockwerk, Sand, Ton)'
			],
			[
				'planar-153.webp',
				'241 - Krumbach-Formation (Kies, Sand, Ton)'
			],
			[
				'planar-154.webp',
				'242 - Mönichkirchen-Formation, Zöbern-Formation (Kristallinblockwerk, Rotlehm)'
			],
			[
				'planar-155.webp',
				'243 - Schliermergel; Eggenburgium - Ottnangium'
			],
			[
				'planar-156.webp',
				'244 - Ritzendorf-Formation; Eggenburgium (Tonmergel, Sand, geröllführend)'
			],
			[
				'planar-157.webp',
				'245 - Augenstein führende Sedimente; Oligozän - ?Unter-Miozän (Kies, Sand, ortsfremd)'
			],
			[
				'planar-158.webp',
				'246 - Sedimente von Wimpassing an der Leitha; Oberes Eozän (gelber und rötlicher Kalk, Sandstein)'
			],
			[
				'planar-159.webp',
				'300 - Buntmergelserie, Klippenhülle i.A.; Oberste Unter-Kreide (Albium) - Mittleres Eozän (Tonmergel, bunt, z.T. Blockeinstreuung)'
			],
			[
				'planar-160.webp',
				'301 - "Klippen"; Mittel-Jura bis Unter-Kreide (Kalkstein, Mergelstein, z.T. bankig)'
			],
			[
				'planar-161.webp',
				'302 - Gresten-Formation; Unter- bis Mittel-Jura (Sandkalk, schiefriger Tonmergel, Kohle)'
			],
			[
				'planar-162.webp',
				'400 - Wolfpassing-Formation und Nordzone i.A.; Unter-Kreide - ?Cenomanium (dunkler schieferiger Flysch, z.T. quarzitisch)'
			],
			[
				'planar-163.webp',
				'401 - Kalkiger Flysch ("Klippen"); Obere Unter-Kreide'
			],
			[
				'planar-164.webp',
				'402 - Serpentinit (Kilb und Umgebung); ?Obere Unter-Kreide'
			],
			[
				'planar-165.webp',
				'403 - Flysch i.A.; Obere Unter-Kreide - Mittleres Eozän (rhythmische Wechsellagerung von Sandstein, Ton- und Mergelstein)'
			],
			[
				'planar-166.webp',
				'404 - Greifenstein-, Gablitz-, Irenental-Formation, Zlin-Formation i.d. Karpaten; Thanetium - Ypresium (z.T. dickbankiger Quarzsandstein)'
			],
			[
				'planar-167.webp',
				'405 - Höhere Flyschschichten i.A.; Obere Ober-Kreide - Paleozän'
			],
			[
				'planar-168.webp',
				'406 - Altlengbach-Formation; Maastrichtium - Paleozän (kalkhaltiger Quarzsandstein, Ton- und Mergelstein)'
			],
			[
				'planar-169.webp',
				'407 - Zementmergelserie und Perneck-Formation; Santonium - Campanium (Kalksandstein und Mergelstein, hellgrau)'
			],
			[
				'planar-170.webp',
				'408 - Tiefere Flyschschichten i.A.; Unter-Kreide - Untere Ober-Kreide'
			],
			[
				'planar-171.webp',
				'409 - Reiselsberg-Formation; Cenomanium - Turonium (kalkhaltiger Quarzsandstein, Ton- und Mergelstein)'
			],
			[
				'planar-172.webp',
				'410 - Unterkreide i.A. (Gaultflysch, Neokomflysch); Obere Unter-Kreide (dunkler, quarzitischer Sandstein, Tonmergel, Kalksandstein, Brekzie)'
			],
			[
				'planar-173.webp',
				'411 - Laab-Formation - Aggsbach-Subformation; Unteres - Mittleres Eozän (vorw. Ton- und Mergelstein)'
			],
			[
				'planar-174.webp',
				'412 - Laab-Formation - Hois-Subformation; Maastrichtium - Paleozän (vorw. Quarzsandstein)'
			],
			[
				'planar-175.webp',
				'413 - Kaumberg-Formation; Santonium - Maastrichtium (Silt- und Tonstein, dünnbankig, bunt)'
			],
			[
				'planar-176.webp',
				'414 - Sievering-Formation; Maastrichtium - Paleozän (kalkhaltiger Quarzsandstein, Ton- und Mergelstein)'
			],
			[
				'planar-177.webp',
				'415 - Kahlenberg-Formation; Campanium - Unteres Maastrichtium (Kalksandstein und Mergelstein, hellgrau)'
			],
			[
				'planar-178.webp',
				'416 - Hütteldorf-Formation; Cenomanium - Santonium (Sandstein, Ton- und Mergelstein, z.T. bunt)'
			],
			[
				'planar-179.webp',
				'417 - Gaultflysch; Aptium - Albium (dunkler, quarzitischer Sandstein, Tonstein, schieferig)'
			],
			[
				'planar-180.webp',
				'418 - Pikrit, Vulkanit i.A.; ?Obere Unter-Kreide'
			],
			[
				'planar-181.webp',
				'419 - Jura und Unter-Kreide der Klippenzone von St. Veit und Baunzen; Jura - Unter-Kreide (Kalkstein, Kieselgestein, Kalkmergel)'
			],
			[
				'planar-182.webp',
				'420 - Gresten-Formation und terrestrischer Dogger; Unter- bis Mittel-Jura (Sandkalk, schiefriger Tonmergel, dunkelgrau)'
			],
			[
				'planar-183.webp',
				'421 - Quarzsandstein (klastischer Keuper) und Kössen-Formation; Ober-Trias (Quarzsandstein; fossilreicher, dunkler Kalk)'
			],
			[
				'planar-184.webp',
				'422 - Ybbsitzer Klippenzone i.A.; Mittel-Jura - Mittleres Eozän'
			],
			[
				'planar-185.webp',
				'423 - Ybbsitzer Flysch i.A.; Obere Unter-Kreide - Mittleres Campanium (Flysch: Kalksandstein und Mergelstein, grau, z.T. bunt)'
			],
			[
				'planar-186.webp',
				'424 - Neokomflysch; Obere Unter-Kreide (Silt- und Tonstein, z.T. kieselig, Brekzie)'
			],
			[
				'planar-187.webp',
				'425 - Radiolarit, Kieselkalk, Kieselschiefer, Aptychenkalk; Mittel- bis Ober-Jura'
			],
			[
				'planar-188.webp',
				'426 - Ophiolit, Serpentinit; Mittel-Jura, Unter-Kreide'
			],
			[
				'planar-189.webp',
				'427 - Sulz-Formation; Ober-Kreide (Flysch - Quarzsandstein und Tonstein, Kalkmergel, z.T. bunt)'
			],
			[
				'planar-190.webp',
				'428 - Klippen von Sulz; Ober-Trias - Unter-Kreide (Kalk, Dolomit, Fleckenkalkmergel)'
			],
			[
				'planar-191.webp',
				'429 - Serpentinit'
			],
			[
				'planar-192.webp',
				'430 - Metagabbro'
			],
			[
				'planar-193.webp',
				'431 - Grünschiefer'
			],
			[
				'planar-194.webp',
				'432 - Phyllit (meist Kalkphyllit)'
			],
			[
				'planar-195.webp',
				'433 - Quarzphyllit'
			],
			[
				'planar-196.webp',
				'434 - Serizitkalkschiefer; Kreide'
			],
			[
				'planar-197.webp',
				'435 - Marmor (Ophikalzit)'
			],
			[
				'planar-198.webp',
				'436 - Caker Konglomerat'
			],
			[
				'planar-199.webp',
				'437 - Rauhwacke; ?Permotrias'
			],
			[
				'planar-200.webp',
				'500 - Gosau-Gruppe i.A.'
			],
			[
				'planar-201.webp',
				'501 - Obere Gosau-Subgruppe; Campanium - Eozän'
			],
			[
				'planar-202.webp',
				'502 - Gießhübel-Formation; Maastrichtium - Paleozän (Sandstein, Mergelstein, Brekzie)'
			],
			[
				'planar-203.webp',
				'503 - Zwieselalm-Formation; Maastrichtium - Eozän (Sandstein, Mergelstein, Brekzie)'
			],
			[
				'planar-204.webp',
				'504 - Nierental-Formation; Campanium - Paleozän (Mergelkalkstein, bunt)'
			],
			[
				'planar-205.webp',
				'505 - Brunnbach-Formation; Campanium - Paleozän (Sandstein, Mergelstein, Konglomerat)'
			],
			[
				'planar-206.webp',
				'506 - Spitzenbach-Formation, Karbonatbrekzie, Hieselberg-Formation; Santonium - Campanium (Karbonatbrekzie)'
			],
			[
				'planar-207.webp',
				'507 - Untere Gosau-Subgruppe (Flachwassergosau); Turonium - Maastrichtium'
			],
			[
				'planar-208.webp',
				'508 - Kohleführende Serie, Dreistettener Konglomerat; Campanium'
			],
			[
				'planar-209.webp',
				'509 - Grobklastika der Gießhübler Mulde; Coniacium - Santonium (Konglomerat, Sandstein, kohlige Lagen)'
			],
			[
				'planar-210.webp',
				'510 - Weisswasser-Formation ("Inoceramenmergel"); Coniacium - Santonium (Kalkmergelstein)'
			],
			[
				'planar-211.webp',
				'511 - Kreuzgraben-Formation; Turonium - Campanium (Konglomerat, rot, basales Konglomerat i.A.)'
			],
			[
				'planar-212.webp',
				'512 - Kreide i.A.'
			],
			[
				'planar-213.webp',
				'513 - Mergel, Brekzie und Karbonatsandstein (Gießhübler Mulde)'
			],
			[
				'planar-214.webp',
				'514 - Losenstein-Formation (Tonmergelstein, Sandstein, Konglomerat)'
			],
			[
				'planar-215.webp',
				'515 - Roßfeld-Formation (Kalkmergelstein, Sandstein)'
			],
			[
				'planar-216.webp',
				'516 - Schrambach-Formation (Mergelkalkstein, Mergelstein, schiefrig)'
			],
			[
				'planar-217.webp',
				'517 - Ammergau-Formation (= Aptychenschichten, z.T. inkl. Schrambach-Formation); Ober-Jura - Unter-Kreide (Mergelkalkstein, hell, dünnbankig)'
			],
			[
				'planar-218.webp',
				'518 - Jura i.A.'
			],
			[
				'planar-219.webp',
				'519 - Ober-Jura (Malm-)Kalke i.A.'
			],
			[
				'planar-220.webp',
				'520 - Oberalm-Formation; Ober-Jura (Kalkstein, hell, bankig)'
			],
			[
				'planar-221.webp',
				'521 - Plassenkalk, Tressensteinkalk; Ober-Jura (Riffkalkstein, Feinschuttkalkstein, hell)'
			],
			[
				'planar-222.webp',
				'522 - Schwellenfazies; Unter - Ober-Jura (Kalkstein, überwiegend rot, z.T. spätig)'
			],
			[
				'planar-223.webp',
				'523 - Jura-Beckenfazies i.A.'
			],
			[
				'planar-224.webp',
				'524 - Ruhpolding-Formation; Ober-Jura (Radiolarit - Kieselgestein)'
			],
			[
				'planar-225.webp',
				'525 - Chiemgau-Formation; Mittel-Jura (Kieselschiefer, Kieselkalkstein)'
			],
			[
				'planar-226.webp',
				'526 - Scheibelberg-Formation; Unter-Jura (Kalkstein mit Hornsteinknollen, dickbankig)'
			],
			[
				'planar-227.webp',
				'527 - Allgäu-Formation; Unter-Jura (Fleckenmergelkalk)'
			],
			[
				'planar-228.webp',
				'528 - Kalksburg-Formation, Kieselkalk; Unter-Jura (Mergel- und Sandkalkstein)'
			],
			[
				'planar-229.webp',
				'529 - Oberseebrekzie; Unter- bis Mittel-Jura (Kalkbrekzie mit Großschollen aus Dachsteinkalk)'
			],
			[
				'planar-230.webp',
				'530 - Oberrhät-(Rhätolias-)Riffkalk'
			],
			[
				'planar-231.webp',
				'531 - Kössen-Formation (Mergel- bis Kalkstein, dunkel); Schattwald-Formation (Tonmergel, rot)'
			],
			[
				'planar-232.webp',
				'532 - Zlambach-Formation (HF - Mergelstein, Kalkstein, dunkel)'
			],
			[
				'planar-233.webp',
				'533 - Dachsteinkalk, Anningerkalk; Norium - Rhätium (Kalkstein, dickbankig)'
			],
			[
				'planar-234.webp',
				'534 - Dachsteinkalk-Riffentwicklung (Kalkstein, massig)'
			],
			[
				'planar-235.webp',
				'535 - Dachsteindolomit; Norium - Rhätium'
			],
			[
				'planar-236.webp',
				'536 - Aflenzerkalk (HF); Norium (Kalkstein, Feinschuttkalkstein, bankig, dunkel)'
			],
			[
				'planar-237.webp',
				'537 - Pedataschichten (HF); Norium (Feinschuttkalkstein, bankig)'
			],
			[
				'planar-238.webp',
				'538 - Pötschenkalk (HF); Oberes Karnium - Norium (Kalkstein mit Hornsteinknollen, bankig, grau)'
			],
			[
				'planar-239.webp',
				'539 - Hallstätter Kalk (oberer) (HF); Oberes Karnium - Norium (Kalkstein, knollig, massig und bankig, bunt)'
			],
			[
				'planar-240.webp',
				'540 - Plattenkalk; Norium - Rhätium (Kalkstein-Dolomitstein-Wechselfolge)'
			],
			[
				'planar-241.webp',
				'541 - Hauptdolomit; Norium (Dolomitstein, bankig)'
			],
			[
				'planar-242.webp',
				'542 - Opponitz-Formation; Oberes Karnium (Kalkstein, Mergelstein, Rauhwacke, Gips)'
			],
			[
				'planar-243.webp',
				'543 - Waxeneckkalk; Oberes Karnium (Kalkstein, massig)'
			],
			[
				'planar-244.webp',
				'544 - Lunz-Formation; Unteres Karnium (Sandstein, feinkörnig, Steinkohle)'
			],
			[
				'planar-245.webp',
				'545 - Reingrabener Schiefer, Hornsteinkalk, Leckkogel-Schichten; Unteres Karnium (Schiefertonstein, Kalkstein, dunkel)'
			],
			[
				'planar-246.webp',
				'546 - Nordalpine Raibl-Formation; Unteres Karnium (Schiefertonstein, Kalkstein, Dolomitstein, dunkel)'
			],
			[
				'planar-247.webp',
				'547 - Wettersteinkalk; Ladinium - Unteres Karnium'
			],
			[
				'planar-248.webp',
				'548 - Wettersteinkalk-Lagune; Ladinium - Unteres Karnium (Kalkstein, bankig bis massig)'
			],
			[
				'planar-249.webp',
				'549 - Wettersteinkalk - Riff und Riffschutt; Ladinium - Unteres Karnium (Kalkstein, massig)'
			],
			[
				'planar-250.webp',
				'550 - Wettersteindolomit, Ramsaudolomit; Ladinium - Unteres Karnium (Dolomitstein)'
			],
			[
				'planar-251.webp',
				'551 - "Sonderentwicklung"; Mittleres Anisium - Unteres Karnium (Kalkstein/Dolomitstein, bankig, dunkel)'
			],
			[
				'planar-252.webp',
				'552 - Partnach-Formation; Ladinium - Unteres Karnium (Tonmergelstein)'
			],
			[
				'planar-253.webp',
				'553 - Raminger Kalk; ?Anisium - Unteres Karnium (Feinschuttkalkstein, massig bis bankig)'
			],
			[
				'planar-254.webp',
				'554 - Reifling-Formation; Anisium - Karnium (Kalkstein mit Hornsteinknollen, bankig)'
			],
			[
				'planar-255.webp',
				'555 - Grafensteigkalk; Mittleres Anisium - Unteres Karnium (Feinschuttkalkstein, bankig, dunkel)'
			],
			[
				'planar-256.webp',
				'556 - Grauer und bunter pelagischer Kalk mit distalem Plattformdetritus; Mittleres Anisium - Unteres Karnium'
			],
			[
				'planar-257.webp',
				'557 - Hallstätter Kalk (unterer) (HF); Anisium - Unteres Karnium (Kalkstein, knollig, massig und bankig, bunt)'
			],
			[
				'planar-258.webp',
				'558 - Steinalmkalk, Steinalmdolomit; Anisium (Kalkstein, Dolomitstein, massig, hell)'
			],
			[
				'planar-259.webp',
				'559 - Gutensteiner Kalk + Dolomit; Anisium (Kalkstein, Dolomitstein, bankig, dunkel)'
			],
			[
				'planar-260.webp',
				'560 - Rauhwacke ("Reichenhall-Formation"); Anisium'
			],
			[
				'planar-261.webp',
				'561 - Werfen-Formation; Unter-Trias (Sandstein, Siltstein, schieferig, Kalkstein)'
			],
			[
				'planar-262.webp',
				'562 - Serpentinit, Melaphyr, Gabbro; ?Perm, ?Trias'
			],
			[
				'planar-263.webp',
				'563 - Haselgebirge; Perm (Tonstein, Gips, Salz)'
			],
			[
				'planar-264.webp',
				'564 - Prebichl-Formation; Perm (Konglomerat, Sandstein, Siltstein)'
			],
			[
				'planar-265.webp',
				'565 - Kieselschiefer mit Olistholithen (u.a. Trias-Radiolarit, "Erzmarmor"); Mittel-Jura'
			],
			[
				'planar-266.webp',
				'566 - Silbersberg-Gruppe i.A.'
			],
			[
				'planar-267.webp',
				'567 - Riebeckitgneis; ?Jura'
			],
			[
				'planar-268.webp',
				'568 - Schiefer, Serizitquarzit, Metakonglomerat; ?Perm'
			],
			[
				'planar-269.webp',
				'569 - Sandstein, Schiefer, Konglomerat; Unter-Karbon'
			],
			[
				'planar-270.webp',
				'570 - Triebenstein-Kalk, Steinberg-Kalk, Dolomit; Unter-Karbon'
			],
			[
				'planar-271.webp',
				'571 - Bänderkalk; Ober-Silur - Unter-Devon'
			],
			[
				'planar-272.webp',
				'572 - Radschiefer; Ordovizium - Silur. Eisenerzer Schichten; Karbon (Phyllit, Tonschiefer, Quarzit)'
			],
			[
				'planar-273.webp',
				'573 - Quarzit i.A., Polsterquarzit; Ordovizium - Silur'
			],
			[
				'planar-274.webp',
				'574 - Metabasit, Metatuffit, Metadiabas, Grünschiefer; Ordovizium - Devon'
			],
			[
				'planar-275.webp',
				'575 - Cystoideenkalk; Ober-Ordovizium'
			],
			[
				'planar-276.webp',
				'576 - Blasseneck Porphyroid, Klastika unter dem Porphyroid; Ober-Ordovizium'
			],
			[
				'planar-277.webp',
				'577 - Vöstenhofer Kristallin und Kaintaleckschollen (Glimmerschiefer, Amphibolit, Marmor)'
			],
			[
				'planar-278.webp',
				'578 - Laufnitzdorf-Gruppe; Silur - Ober-Devon (Schiefer, Lydit, Karbonat, Sandstein = Dornerkogel-Formation)'
			],
			[
				'planar-279.webp',
				'579 - Basische Metavulkanite und Metatuffite'
			],
			[
				'planar-280.webp',
				'580 - Hochschlag-Formation, Schöckl-Kalk und Karbonat i.A.; ?Devon (Kalk-Kalkmarmor, Dolomit-Dolomitmarmor)'
			],
			[
				'planar-281.webp',
				'581 - Kogler-Formation; Silur - Mittel-Devon (Plattenkalk)'
			],
			[
				'planar-282.webp',
				'582 - Schönberg-Formation ("Arzberger Schichten"); Devon (Kalk, Schwarzschiefer)'
			],
			[
				'planar-283.webp',
				'583 - Passail-Gruppe; Silur - Unter-Devon (Phyllit)'
			],
			[
				'planar-284.webp',
				'584 - Anger-Kristallin (Glimmerschiefer, phyllitischer Glimmerschiefer)'
			],
			[
				'planar-285.webp',
				'600 - Dünnplattiger Kalk; Rhätium'
			],
			[
				'planar-286.webp',
				'601 - Serizitschiefer; "Bunter Keuper"; Karnium - Norium'
			],
			[
				'planar-287.webp',
				'602 - Anhydrit, Gips, Dolomit, Schwarzer Tonschiefer (Kapellener Schiefer); Karnium'
			],
			[
				'planar-288.webp',
				'603 - Karbonate der Mitteltrias i.A.; Anisium - Ladinium'
			],
			[
				'planar-289.webp',
				'604 - Wettersteindolomit; Anisium - Ladinium'
			],
			[
				'planar-290.webp',
				'605 - Dunkler, geschichteter Dolomit, Tonschiefer; Anisium - Ladinium'
			],
			[
				'planar-291.webp',
				'606 - Kalk, Bänderkalk bis Kalkmarmor; Anisium'
			],
			[
				'planar-292.webp',
				'607 - Rauhwacke; Anisium'
			],
			[
				'planar-293.webp',
				'608 - "Permoskyth" i.A.'
			],
			[
				'planar-294.webp',
				'609 - Semmeringquarzit, Luzna-Formation; Unter-Trias'
			],
			[
				'planar-295.webp',
				'610 - Alpiner Verrucano, Tattermann-Schiefer, Devin-Formation; Perm (Meta-Konglomerat, Quarzit, Serizitphyllit)'
			],
			[
				'planar-296.webp',
				'611 - Roßkogelporphyroid'
			],
			[
				'planar-297.webp',
				'612 - Aplit, Pegmatit'
			],
			[
				'planar-298.webp',
				'613 - Orthogneis'
			],
			[
				'planar-299.webp',
				'614 - Glimmerschiefer, Paragneis'
			],
			[
				'planar-300.webp',
				'615 - Amphibolit, Hornblendengneis, Serpentinit'
			],
			[
				'planar-301.webp',
				'616 - Marmor'
			],
			[
				'planar-302.webp',
				'617 - Schwarzglimmerschiefer ("Schwarze Serie")'
			],
			[
				'planar-303.webp',
				'618 - Amphibolit, Bänderamphibolit, Speikkomplex'
			],
			[
				'planar-304.webp',
				'619 - Strallegger Gneis und Äquivalente'
			],
			[
				'planar-305.webp',
				'620 - Amphibolit'
			],
			[
				'planar-306.webp',
				'621 - Gabbro (Birkfelder Gabbro)'
			],
			[
				'planar-307.webp',
				'622 - Pegmatit'
			],
			[
				'planar-308.webp',
				'623 - Granitgneis'
			],
			[
				'planar-309.webp',
				'624 - Grobgneis, Randquarzit, Leukophyllit'
			],
			[
				'planar-310.webp',
				'625 - Hüllschiefer (Glimmerschiefer, Phyllit)'
			],
			[
				'planar-311.webp',
				'626 - Biotit-Plagioklas-Gneis bis Glimmerschiefer'
			],
			[
				'planar-312.webp',
				'627 - Feinkörniger Orthogneis'
			],
			[
				'planar-313.webp',
				'628 - Augengneis'
			],
			[
				'planar-314.webp',
				'629 - Heller, phyllonitischer Glimmerschiefer (Waldbach-Phyllit), Phyllonit'
			],
			[
				'planar-315.webp',
				'630 - Hornblendegneis'
			],
			[
				'planar-316.webp',
				'631 - Amphibolit, Bänderamphibolit'
			],
			[
				'planar-317.webp',
				'632 - Schwarzphyllit'
			],
			[
				'planar-318.webp',
				'633 - Erzführende Serie: Phyllit und Hornblende-Gesteine'
			],
			[
				'planar-319.webp',
				'634 - Granitgneis'
			],
			[
				'planar-320.webp',
				'635 - Wiesmather Gneis und Äquivalente (Granitgneis, feinkörnig, hell)'
			],
			[
				'planar-321.webp',
				'636 - Glimmerschiefer, z.T. Granat-Chloritoid führend'
			],
			[
				'planar-322.webp',
				'637 - Wechselschiefer (Graphitphyllit, Graphitquarzit, Phyllit)'
			],
			[
				'planar-323.webp',
				'638 - Wechselgneis'
			],
			[
				'planar-324.webp',
				'639 - Amphibolit, Chlorit-Epidot-Blastenschiefer'
			],
			[
				'planar-325.webp',
				'640 - Somar-Formation; Mittel-Jura (Brekzie mit kristallinen Komponenten)'
			],
			[
				'planar-326.webp',
				'641 - Slepy- und Korenec-Formation; Mittel-Jura (Turbidit in dunklen Schiefern)'
			],
			[
				'planar-327.webp',
				'642 - Marianka-Formation (Marientaler Schichten); Unter-Jura (dunkler Schiefer)'
			],
			[
				'planar-328.webp',
				'643 - Prepadle-Formation (Ballensteiner Kalk); Unter-Jura'
			],
			[
				'planar-329.webp',
				'644 - Autochthone/Parautochthone Sedimente; Jura - Kreide'
			],
			[
				'planar-330.webp',
				'645 - Diorit'
			],
			[
				'planar-331.webp',
				'646 - Mittelkörniger, leukokrater, muskovitreicher Zweiglimmergranit bis Granodiorit'
			],
			[
				'planar-332.webp',
				'647 - Grobkörniger Muskovit bis Muskovit-Biotit-Granit, Granodiorit i.A.'
			],
			[
				'planar-333.webp',
				'648 - Dunkler Schiefer, Graphitphyllit, Metaquarzit'
			],
			[
				'planar-334.webp',
				'649 - Chlorit-Biotit-Phyllit, Meta-Sandstein, Meta-Rauhwacke'
			],
			[
				'planar-335.webp',
				'650 - Grünschiefer der Harmonia-Serie'
			],
			[
				'planar-336.webp',
				'651 - Amphibolit'
			],
			[
				'planar-337.webp',
				'700 - Klikov-Formation ("Gmünder Schichten"); Ober-Kreide (Tonstein, Sandstein, Konglomerat)'
			],
			[
				'planar-338.webp',
				'701 - Zöbing-Formation; Ober-Karbon - Perm (Sandstein, Tonschiefer, Kalk)'
			],
			[
				'planar-339.webp',
				'702 - Grauwacke, Konglomerat (Boskowitzer Furche); Karbon'
			],
			[
				'planar-340.webp',
				'703 - Lesonice-Kalk; Devon'
			],
			[
				'planar-341.webp',
				'704 - "Old Red" (über Brünner Pluton, Mähren); Kambrium - Devon (Konglomerat, Sandstein, Tonstein)'
			],
			[
				'planar-342.webp',
				'705 - Amphibolit i.A.'
			],
			[
				'planar-343.webp',
				'706 - Diorit, Gabbro'
			],
			[
				'planar-344.webp',
				'707 - Ultrabasit, Serpentinit'
			],
			[
				'planar-345.webp',
				'708 - Mylonit, Störungszone i.A.'
			],
			[
				'planar-346.webp',
				'709 - Paragneis, Mischgneis, Glimmerschiefer (Drosendorf-Einheit, Gföhl-Einheit)'
			],
			[
				'planar-347.webp',
				'710 - Granitgneis Typ Weiterndorf, Meires, Lancov u.a.'
			],
			[
				'planar-348.webp',
				'711 - Quarzit'
			],
			[
				'planar-349.webp',
				'712 - Granat-Pyroxenit, Eklogit'
			],
			[
				'planar-350.webp',
				'713 - Granulit'
			],
			[
				'planar-351.webp',
				'714 - (Granat-)Pyroxen-Amphibolit'
			],
			[
				'planar-352.webp',
				'715 - Wolfshofer Syenitgneis'
			],
			[
				'planar-353.webp',
				'716 - Gföhler Gneis (Granitgneis)'
			],
			[
				'planar-354.webp',
				'717 - Migmatitgneis, migmatischer Paragneis (Mähren)'
			],
			[
				'planar-355.webp',
				'718 - Graphitquarzit'
			],
			[
				'planar-356.webp',
				'719 - Mischserie von Biotitgneis, Amphibolit, Augitgneis'
			],
			[
				'planar-357.webp',
				'720 - Augitgneis'
			],
			[
				'planar-358.webp',
				'721 - Buschandlwand- und Rehberg-Amphibolit'
			],
			[
				'planar-359.webp',
				'722 - Leukoquarzdioritgneis (Hartenstein-Gneis)'
			],
			[
				'planar-360.webp',
				'723 - Dioritgneis, Biotitamphibolit'
			],
			[
				'planar-361.webp',
				'724 - Marmor, Silikatmarmor'
			],
			[
				'planar-362.webp',
				'725 - Graphit'
			],
			[
				'planar-363.webp',
				'726 - Kalksilikatgneis'
			],
			[
				'planar-364.webp',
				'727 - Granodioritgneis von Spitz'
			],
			[
				'planar-365.webp',
				'728 - Dobra-Gneis (Granitgneis, stellenweise mit Amphibolitlagen)'
			],
			[
				'planar-366.webp',
				'729 - Cordierit-Sillimanitgneis, Biotit-Plagioklas-Gneis, Zweiglimmergneis'
			],
			[
				'planar-367.webp',
				'730 - Leukokrater, häufig Sillimanit führender Orthogneis'
			],
			[
				'planar-368.webp',
				'731 - Schiefergneis'
			],
			[
				'planar-369.webp',
				'732 - Metatexit (Perlgneis)'
			],
			[
				'planar-370.webp',
				'733 - Übergangszone von Schiefergneis zu Perlgneis'
			],
			[
				'planar-371.webp',
				'734 - Eisgarner Granit i.A. (Zweiglimmer-Granitgneis)'
			],
			[
				'planar-372.webp',
				'735 - feinkörnig'
			],
			[
				'planar-373.webp',
				'736 - mittel- bis grobkörnig'
			],
			[
				'planar-374.webp',
				'737 - porphyrisch (Typ Cimer)'
			],
			[
				'planar-375.webp',
				'738 - Muskovitgranit, Typ Galthof (Homolka)'
			],
			[
				'planar-376.webp',
				'739 - Zweiglimmergranit i.A.'
			],
			[
				'planar-377.webp',
				'740 - Altenberger Granit'
			],
			[
				'planar-378.webp',
				'741 - Granit mit Molybdänvererzung (Kozi Hora und Nebelstein-Suite)'
			],
			[
				'planar-379.webp',
				'742 - Mauthausener Granit, Schremser Granit, Leukogranite und Feinkorngranite i.A. (fein- bis mittelkörnige Granite)'
			],
			[
				'planar-380.webp',
				'743 - Aplit'
			],
			[
				'planar-381.webp',
				'744 - Granitporphyr, Granitgänge'
			],
			[
				'planar-382.webp',
				'745 - Jüngere Granitstöcke im Weinsberger Granit (Typ Plochwald etc.)'
			],
			[
				'planar-383.webp',
				'746 - Weinsberger Granit (grob- bis riesenkörnig, mit porphyrischen Alkalifeldspat)'
			],
			[
				'planar-384.webp',
				'747 - Migmagranit'
			],
			[
				'planar-385.webp',
				'748 - Übergangszone Weinsberger Granit - Grobkorngneis, Vermischungszonen von Weinsberger Granit mit Migmagranit bzw. Engerwitzdorfer Granit'
			],
			[
				'planar-386.webp',
				'749 - Schlierengranit (Diatexit mit porphyrischen Kalifeldspaten, Grobkorngneis)'
			],
			[
				'planar-387.webp',
				'750 - Wolfsegger Granit (Biotit-Granit)'
			],
			[
				'planar-388.webp',
				'751 - Rastenberger Granodiorit (Durbachit) (grobkörnig mit porphyrischen Alkalifeldspat und Hornblende)'
			],
			[
				'planar-389.webp',
				'752 - Randgranit des Rastenberger Granodioritplutons (feinkörniger Biotitgranit)'
			],
			[
				'planar-390.webp',
				'753 - Freistädter Granodiorit, grobkörnig'
			],
			[
				'planar-391.webp',
				'754 - Freistädter Granodiorit, feinkörnig'
			],
			[
				'planar-392.webp',
				'755 - Karlstifter Granit (mittelkörniger Biotitgranit mit porphyrischer Randfazies)'
			],
			[
				'planar-393.webp',
				'756 - Engerwitzdorfer Granit (mittelkörniger Biotitgranit mit porphyrischem rosa Alkalifeldspat)'
			],
			[
				'planar-394.webp',
				'757 - Metamorphe Karbonatgesteine i.A. (Marmor, Silikatmarmor, Kalksilikatgneis)'
			],
			[
				'planar-395.webp',
				'758 - Bittescher Gneis (Granitgneis, stellenweise mit Amphibolitlagen)'
			],
			[
				'planar-396.webp',
				'759 - Weitersfelder Stengelgneis, Arkose-Grauwackengneis'
			],
			[
				'planar-397.webp',
				'760 - Glimmerschiefer, Paragneis, Quarzit, Amphibolit der Therasburg- und Pernegg-Gruppe'
			],
			[
				'planar-398.webp',
				'761 - Therasburg-Gneis (Granodioritgneis)'
			],
			[
				'planar-399.webp',
				'762 - Porphyroid von Zeletice'
			],
			[
				'planar-400.webp',
				'763 - Thaya-Batholit/Brünner Pluton (Granit bis Granodiorit)'
			],
			[
				'planar-401.webp',
				'830 - Oberflächengewässer'
			]
		]
	},
	{
		'name': '断層・ナップ境界などの地質構造（原語：ドイツ語）',
		'items': [
			[
				'tectonic-000.webp',
				'Störung gesichert'
			],
			[
				'tectonic-001.webp',
				'Störung vermutet'
			],
			[
				'tectonic-002.webp',
				'Geneigte Störung im Bereich des Wiener Beckens gesichert'
			],
			[
				'tectonic-003.webp',
				'Geneigte Störung im Bereich des Wiener Beckens vermutet'
			],
			[
				'tectonic-004.webp',
				'Deckengrenze 1. Ordnung gesichert'
			],
			[
				'tectonic-005.webp',
				'Deckengrenze 1. Ordnung vermutet'
			],
			[
				'tectonic-006.webp',
				'Deckengrenze 2. Ordnung gesichert'
			],
			[
				'tectonic-007.webp',
				'Deckengrenze 2. Ordnung vermutet'
			],
			[
				'tectonic-008.webp',
				'Teildecken- und Schuppengrenze gesichert'
			],
			[
				'tectonic-009.webp',
				'Teildecken- und Schuppengrenze vermutet'
			],
			[
				'tectonic-010.webp',
				'Seitenverschiebung (1) vermutet'
			],
			[
				'tectonic-011.webp',
				'Seitenverschiebung (2) vermutet'
			]
		]
	}
] as const;

const legend: ImageLegend = {
	type: 'image',
	categories: groups.map(({ name, items }) => ({
		name,
		urls: items.map(([file]) => `${IMG}/${file}`),
		labels: items.map(([, label]) => label)
	}))
};

export default legend;
