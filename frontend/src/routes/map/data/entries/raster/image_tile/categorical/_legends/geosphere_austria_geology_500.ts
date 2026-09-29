import { LEGEND_DATA_PATH } from '$routes/constants';
import type { ImageLegend } from '$routes/map/data/types/raster';

// 提供元の記号と原語ラベルの対応: https://gis.geosphere.at/maps/rest/services/geologie/karte_500/MapServer/legend?f=pjson
const IMG = LEGEND_DATA_PATH + '/geosphere_austria_geology_500';
const groups = [
	{
		name: '岩石・地層など（原語：ドイツ語）',
		items: [
			['geology-000.webp', '1 - Firn, Gletscher'],
			[
				'geology-001.webp',
				'2 - Quartär i. Allg. (Alluvium; Pleistozän entlang der Hauptentwässerungslinien und Moränen im Alpenvorland)'
			],
			['geology-002.webp', '3 - Molassezone; Obereozän - Miozän; Inneralpine Becken; Neogen'],
			[
				'geology-003.webp',
				'4 - Allochthone und parautochthone Molasse; Obereozän - Miozän/Oberjura'
			],
			['geology-004.webp', '5 - Alttertiärklippen (Ernstbrunner Klippen)'],
			['geology-005.webp', '6 - Andesit, Dazit, Trachyt; Karpat, Baden'],
			[
				'geology-006.webp',
				'7 - Basalt, Basanit, Nephelinit, Tuff, Sarmat/Pannon - Plio-/Pleistozän'
			],
			['geology-007.webp', '8 - Post-variszische Klastika (Perm von Zöbing); Perm'],
			['geology-008.webp', '9 - Granitoid (Südböhmischer Pluton); Karbon'],
			[
				'geology-009.webp',
				'10 - Metamorphite i. Allg.: meist Paragneis, Glimmerschiefer (Moldanubikum, Moravikum)'
			],
			['geology-010.webp', '11 - Orthogneis'],
			['geology-011.webp', '12 - Migmatit'],
			['geology-012.webp', '13 - Amphibolit'],
			['geology-013.webp', '14 - Marmor, Kalksilikatgestein'],
			['geology-014.webp', '15 - Granulit'],
			['geology-015.webp', '16 - Ultrabasit'],
			[
				'geology-016.webp',
				'17 - Kontinentalrandsediment (Helvetikum i.w.S. inkl. Grestener- und Hauptkilppenzone); Jura - Mitteleozän'
			],
			[
				'geology-017.webp',
				'18 - Liebensteiner- und Feuerstätter Decke (nicht differenziert); Lias - Eozän'
			],
			['geology-018.webp', '19 - Rhenodanubischer Flysch; Unterkreide - Eozän'],
			[
				'geology-019.webp',
				'20 - Tiefmarines Sediment - Ophiolith (Ybbsitzer- , Sulzer- und St. Veiter-Klippen, Nordrandzone); Jura - Kreide'
			],
			[
				'geology-020.webp',
				'21 - Tektonische Melange ostalpiner und penninischer Gesteine (Matreier Zone - Nordrahmenzone, Richbergkogel-Serie, Arosa-Zone); Permomesozoikum'
			],
			[
				'geology-021.webp',
				'22 - Ozeanisches Metasediment, z. T. flyschartig (Bündner Schiefer, Rechnitzer Serie, Prättigauflysch); Jura - Kreide, z. T. Alttertiär'
			],
			['geology-022.webp', '23 - Grünschiefer, Prasinit, Serpentinit'],
			['geology-023.webp', '24 - Eklogit führendes Metasediment'],
			[
				'geology-024.webp',
				'25 - Metasediment (in Falknis- und Sulzfluh-Decke nicht differenziert ); Permomesozoikum, z. T. Alttertiär'
			],
			['geology-025.webp', '26 - Metasediment (Tasna-Decke); Permotrias'],
			['geology-026.webp', '27 - Metasediment (Brennkogel-, Kaserer-Serie); Jura - Kreide'],
			['geology-027.webp', '28 - Metasediment (Hochstegen-Serie); Malm'],
			[
				'geology-028.webp',
				'29 - Metasediment (Wustkogel-, Seidlwinkel-, Schrovin-Serie); Permotrias'
			],
			['geology-029.webp', '30 - Orthogneis (Zentralgneis); Permokarbon'],
			[
				'geology-030.webp',
				'31 - Metasediment, Metavulkanit (Habach-, Greiner-, Storz-, Kareck-Serie); Paläozoikum'
			],
			[
				'geology-031.webp',
				'32 - Migmatit, Anatexit, migmatischer Paragneis (Altes Dach, Altkristallin i. Allg.)'
			],
			['geology-032.webp', '33 - Amphibolit (Zwölferzug-Basisamphibolit)'],
			['geology-033.webp', '34 - meist Klastika (Gosau - Schichten); Oberkreide - Eozän'],
			['geology-034.webp', '35 - überwiegend Karbonatgestein; Mitteltrias - Unterkreide'],
			['geology-035.webp', '36 - Siliciklastika;  Permoskyth'],
			['geology-036.webp', '37 - überwiegend Karbonatgestein;  Mitteltrias - Jura'],
			['geology-037.webp', '38 - Siliciklastika;  Permoskyth'],
			['geology-038.webp', '39 - Porphyroid; Perm'],
			[
				'geology-039.webp',
				'40 - Karbonatgestein, Klastika (Karbon von Nötsch); oberes Vise - Oberkarbon'
			],
			[
				'geology-040.webp',
				'41 - Karbonatgestein, Klastika (Grauwackenzone / Veitscher Decke); oberes Vise - Oberkarbon'
			],
			[
				'geology-041.webp',
				'42 - Phyllit, Metaklastika, Metavulkanit (Grauwackenzone/Silbersberg-Decke westl. Aflenz nicht ausgeschieden); Altpaläozoikum i. Allg. ?Permoskyth'
			],
			['geology-042.webp', '43 - Post-variszische Klastika; Oberkarbon'],
			[
				'geology-043.webp',
				'44 - überwiegend pelitisch-psammitisches Sediment; Oberordovicium'
			],
			['geology-044.webp', '45 - Quarzphyllite, z. T. Phyllonite'],
			['geology-045.webp', '46 - Karbonatgestein'],
			['geology-046.webp', '47 - Basischer Vulkanit'],
			['geology-047.webp', '48 - Porphyroid (Blasseneck Porphyroid); Oberordovicium'],
			['geology-048.webp', '49 - Granitoid; Permokarbon'],
			[
				'geology-049.webp',
				'50 - Altkristallin i. Allg. (meist Paragneis, Glimmerschiefer lokal, auch Granatphyllit)'
			],
			['geology-050.webp', '51 - Orthogneis'],
			['geology-051.webp', '52 - Amphibolit'],
			['geology-052.webp', '53 - Marmor'],
			['geology-053.webp', '54 - Ultrabasit'],
			['geology-054.webp', '55 - Schladminger Kristallin'],
			['geology-055.webp', '56 - Bundschuh Kristallin'],
			['geology-056.webp', '57 - Granitoid; Permokarbon'],
			['geology-057.webp', '58 - Tonalit, Granodiorit, Oligozän'],
			['geology-058.webp', '59 - Ganggestein (im Gefolge der tertiären Intrusionen)'],
			['geology-059.webp', '60 - Karbonatgestein; Trias'],
			[
				'geology-060.webp',
				'61 - Post-variszische Klastika und Karbonatgestein; Oberkarbon - Perm'
			],
			['geology-061.webp', '62 - Kalk, Feinklastika'],
			['geology-062.webp', '63 - Phyllit; Oberordovicium - Unterkarbon'],
			['geology-063.webp', '64 - Comelico-Porphyroid;  Ordovicium'],
			['geology-064.webp', '65 - Gewässer']
		]
	},
	{
		name: '断層・ナップ境界などの地質構造（原語：ドイツ語）',
		items: [
			['tectonic-000.webp', 'Störung i. Allg. nachgewiesen'],
			['tectonic-001.webp', 'Störung i. Allg. vermutet'],
			['tectonic-002.webp', 'Deckengrenzen zweiter Ordnung nachgewiesen'],
			['tectonic-003.webp', 'Deckengrenzen zweiter Ordnung vermutet'],
			[
				'tectonic-004.webp',
				'Hauptdeckengrenzen der helvetischen, penninischen und ostalpinen Einheiten nachgewiesen'
			],
			[
				'tectonic-005.webp',
				'Hauptdeckengrenzen der helvetischen, penninischen und ostalpinen Einheiten vermutet'
			],
			['tectonic-006.webp', 'Störung i. Allg. nachgewiesen'],
			['tectonic-007.webp', 'Störung i. Allg. vermutet'],
			['tectonic-008.webp', 'geneigte Störung nachgewiesen'],
			['tectonic-009.webp', 'geneigte Störung vermutet'],
			['tectonic-010.webp', 'Deckengrenze vermutet']
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
