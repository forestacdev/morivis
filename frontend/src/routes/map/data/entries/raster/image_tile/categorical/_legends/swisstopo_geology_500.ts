import { LEGEND_DATA_PATH } from '$routes/constants';
import type { ImageLegend } from '$routes/map/data/types/raster';

// 記号画像と原語ラベルの対応。提供元: https://api3.geo.admin.ch/static/images/legends/ch.swisstopo.geologie-geologische_karte_en_big.pdf
const IMG = LEGEND_DATA_PATH + '/swisstopo_geology_500';
const groups = [
	{
		'name': 'アルプス外の第三系：北側前縁地域',
		'items': [
			[
				'000.webp',
				'Sundgau-Schotter'
			],
			[
				'001.webp',
				'Alte Verwitterungslehme, Höhenlehme'
			],
			[
				'002.webp',
				'Fluviolakustrische Ablagerungen im Bresse-Graben'
			],
			[
				'003.webp',
				'Vogesen-Sande und -Schotter'
			],
			[
				'004.webp',
				'Obere Süsswassermolasse (OSM): Langhien–Serravallien («Tortonien»)'
			],
			[
				'005.webp',
				'Obere Meeresmolasse (OMM): «Helvétien»'
			],
			[
				'006.webp',
				'Obere Meeresmolasse (OMM): Burdigalien (im Allgäu inkl. «Helvétien»)'
			],
			[
				'007.webp',
				'Untere Süsswassermolasse (USM): Aquitanien'
			],
			[
				'008.webp',
				'Untere Süsswassermolasse (USM): Chattien'
			],
			[
				'009.webp',
				'Untere Meeresmolasse (UMM): Rupélien'
			],
			[
				'010.webp',
				'Fluviolakustrische bis salinare Ablagerungen («Sannoisien»): Rupélien'
			],
			[
				'011.webp',
				'Bohnerzformation'
			]
		]
	},
	{
		'name': 'モラッセ中の特徴的な岩相',
		'items': [
			[
				'012.webp',
				'Polymikte Nagelfluh (Kristallinanteil ≥ 10%)'
			],
			[
				'013.webp',
				'Kalknagelfluh (Kristallinanteil < 10%)'
			],
			[
				'014.webp',
				'Dünne Tufflagen des Hegau-Vulkanismus'
			],
			[
				'015.webp',
				'Auswürflinge in der St. Galler Molasse (vorw. Malmkalk-Blöcke)'
			],
			[
				'016.webp',
				'Bentonit-Vorkommen in der Oberen Süsswassermolasse'
			]
		]
	},
	{
		'name': 'アルプス外の第三系：南側前縁地域',
		'items': [
			[
				'017.webp',
				'Pontegana-Konglomerat (Messinien) und marine Tone (Pliozän)'
			]
		]
	},
	{
		'name': 'アルプス外の古生界・中生界',
		'items': [
			[
				'018.webp',
				'Albien und Oberkreide'
			],
			[
				'019.webp',
				'Unterkreide'
			],
			[
				'020.webp',
				'Malm'
			],
			[
				'021.webp',
				'Dogger'
			],
			[
				'022.webp',
				'Lias'
			],
			[
				'023.webp',
				'Rhät'
			],
			[
				'024.webp',
				'Keuper'
			],
			[
				'025.webp',
				'Muschelkalk'
			],
			[
				'026.webp',
				'Buntsandstein'
			],
			[
				'027.webp',
				'Perm (Rotliegendes)'
			],
			[
				'028.webp',
				'Oberkarbon'
			],
			[
				'029.webp',
				'Unterkarbon'
			],
			[
				'030.webp',
				'Altpaläozoikum–Unterkarbon, ungegliedert'
			]
		]
	},
	{
		'name': '東アルプス上部・南アルプスの堆積岩',
		'items': [
			[
				'031.webp',
				'Gonfolite Lombarda (grobklastische Resedimente), inkl. Chiasso-Formation'
			],
			[
				'032.webp',
				'Paläozän und Eozän'
			],
			[
				'033.webp',
				'Oberkretazischer Flysch'
			],
			[
				'034.webp',
				'Oberkreide'
			],
			[
				'035.webp',
				'Unterkreide'
			],
			[
				'036.webp',
				'Malm (z.T. inkl. Unterkreide)'
			],
			[
				'037.webp',
				'Dogger (z.T. inkl. Unterkreide)'
			],
			[
				'038.webp',
				'Mittel- und Oberlias'
			],
			[
				'039.webp',
				'Unterlias bzw. Lias im Allgemeinen'
			],
			[
				'040.webp',
				'Rhät'
			],
			[
				'041.webp',
				'Hauptdolomit (Norien) bzw. Trias im Allgemeinen'
			],
			[
				'042.webp',
				'Raibler Schichten (Carnien)'
			],
			[
				'043.webp',
				'Ladinien und unteres Carnien (z.T. inkl. Anisien)'
			],
			[
				'044.webp',
				'Anisien'
			],
			[
				'045.webp',
				'Untertrias (z.T. inkl. Anisien); Servino-Verrucano-Serien'
			],
			[
				'046.webp',
				'Perm; Servino-Verrucano-Serien'
			],
			[
				'047.webp',
				'Oberkarbon'
			],
			[
				'048.webp',
				'Grauwackenzone: Ordovizium–Perm'
			],
			[
				'049.webp',
				'Walsertal-Zone: Trias–Kreide'
			],
			[
				'050.webp',
				'Canavese-Zone: Perm–Kreide'
			]
		]
	},
	{
		'name': '東アルプス下部の堆積岩',
		'items': [
			[
				'051.webp',
				'Jura–Kreide (z.T. inkl. Trias)'
			],
			[
				'052.webp',
				'Dogger'
			],
			[
				'053.webp',
				'Lias'
			],
			[
				'054.webp',
				'Rhät'
			],
			[
				'055.webp',
				'Hauptdolomit (Norien) bzw. Trias im Allgemeinen'
			],
			[
				'056.webp',
				'Raibler Schichten (Carnien)'
			],
			[
				'057.webp',
				'Ladinien und unteres Carnien (z.T. inkl. Anisien)'
			],
			[
				'058.webp',
				'Anisien'
			],
			[
				'059.webp',
				'Perm'
			],
			[
				'060.webp',
				'Oberkarbon'
			],
			[
				'061.webp',
				'Zone von Roisan: Paläozoikum–Kreide'
			]
		]
	},
	{
		'name': 'ペンニン帯：南部～ウルトラペンニン帯',
		'items': [
			[
				'062.webp',
				'Unterkreide und Flysch des Perrières, Hundsrück-Flysch (mit Ophiolithen und Graniten)'
			],
			[
				'063.webp',
				'Flysch der Simmen-Decke'
			],
			[
				'064.webp',
				'Flysch à Helminthoïdes, Plattenflysch'
			],
			[
				'065.webp',
				'Gurnigel-, Schlieren- und Wägitaler Flysch, Flysch des Voirons'
			],
			[
				'066.webp',
				'Jura–Kreide («Bündnerschiefer»)'
			],
			[
				'067.webp',
				'Jura–Unterkreide der Simmen-Decke'
			],
			[
				'068.webp',
				'Flysch der Aroser Zone'
			],
			[
				'069.webp',
				'Perm–Kreide der Aroser Zone und der Platta-Decke (z.T. ostalpine Affinitäten), mit Ophiolithen'
			]
		]
	},
	{
		'name': 'ペンニン帯：中部（Briançonnais-Schwelle s.l.）',
		'items': [
			[
				'070.webp',
				'Flysch im Allgemeinen'
			],
			[
				'071.webp',
				'Flysch der Breccien-Decke (Paläozän–?Untereozän)'
			],
			[
				'072.webp',
				'Flysch der Tasna- und der Klippen-Decke (Eozän)'
			],
			[
				'073.webp',
				'Aptien–Untereozän (Couches rouges)'
			],
			[
				'074.webp',
				'Unterkreide'
			],
			[
				'075.webp',
				'Malm bzw. Jura im Allgemeinen'
			],
			[
				'076.webp',
				'Dogger'
			],
			[
				'077.webp',
				'Lias'
			],
			[
				'078.webp',
				'Trias'
			],
			[
				'079.webp',
				'Permo-Trias'
			],
			[
				'080.webp',
				'Perm'
			],
			[
				'081.webp',
				'Permo-Karbon'
			],
			[
				'082.webp',
				'Oberkarbon'
			]
		]
	},
	{
		'name': 'ペンニン帯：中部（続き）',
		'items': [
			[
				'083.webp',
				'Jura–Unterkreide der Breccien-Decke'
			],
			[
				'084.webp',
				'Trias–Kreide (z.T. bis Eozän) der Siviez-Mischabel-, Tambo-, Suretta- und Monte-Rosa-Decke'
			],
			[
				'085.webp',
				'Frilihorn- und Cimes-Blanches-Decke: Perm–Kreide'
			],
			[
				'086.webp',
				'Jura–Kreide der Schamser Decken'
			]
		]
	},
	{
		'name': 'ペンニン帯：北部',
		'items': [
			[
				'087.webp',
				'Flysch im Allgemeinen'
			],
			[
				'088.webp',
				'Niesen-Flysch'
			],
			[
				'089.webp',
				'Wildflysch der Zone Submédiane'
			],
			[
				'090.webp',
				'Tomül- und Prättigau-Flysch, Flysch der Zone von Roz-Champatsch'
			],
			[
				'091.webp',
				'Tertiär (Unités de la Pierre Avoi et des Cols)'
			],
			[
				'092.webp',
				'Liechtensteiner und Vorarlberger Flysch'
			],
			[
				'093.webp',
				'Roignais-Versoyen-Flysch'
			],
			[
				'094.webp',
				'«Complexe antéflysch» et «formation basale»'
			],
			[
				'095.webp',
				'Schiefer der «Unité de Ferret» (Oberkreide und/oder Tertiär)'
			],
			[
				'096.webp',
				'Bündnerschiefer (Grava- und Tomül-Decke): Malm–Kreide'
			],
			[
				'097.webp',
				'Jura der Zone Submédiane, Niesen- und Aul-Decke'
			],
			[
				'098.webp',
				'Karbonatarme Metakonglomerate der Lebendun-Decke'
			],
			[
				'099.webp',
				'Mesozoikum des externen Nordpenninikums'
			],
			[
				'100.webp',
				'Trias'
			],
			[
				'101.webp',
				'Perm'
			],
			[
				'102.webp',
				'Karbon'
			]
		]
	},
	{
		'name': 'ヘルベティック帯：上部白亜系～第三系',
		'items': [
			[
				'103.webp',
				'Ultrahelvetikum–?Penninikum: Flysch du Meilleret, Sardona-Flysch, Feuerstätter Decke'
			],
			[
				'104.webp',
				'Ultrahelvetikum–?Penninikum: Wildflysch (Gros-Plané, Habkern, Liebenstein u.a.)'
			],
			[
				'105.webp',
				'Ultrahelvetische Flysche im Allgemeinen'
			],
			[
				'106.webp',
				'Abgeschertes und eingewickeltes Südhelvetikum (Schuppenzone von Einsiedeln und Wildhaus, Blattengrat-Komplex, Ragazer Flysch, Unterlage des Fähnernspitz, Schuppenzone von Liebenstein)'
			],
			[
				'107.webp',
				'Subalpiner Flysch (z.T. nordhelvetisch)'
			],
			[
				'108.webp',
				'Nordhelvetischer Flysch (Matter Formation, Engi-Dachschiefer, Altdorfer Sandstein, Grès du Val d’Illiez, Grès de Taveyanne)'
			],
			[
				'109.webp',
				'Globigerinenschiefer'
			],
			[
				'110.webp',
				'Neritische Sandsteine und Kalke (Nummuliten-, Lithothamnienkalk)'
			]
		]
	},
	{
		'name': 'ヘルベティック帯：古生界・中生界',
		'items': [
			[
				'111.webp',
				'Oberkreide'
			],
			[
				'112.webp',
				'Unterkreide'
			],
			[
				'113.webp',
				'Malm'
			],
			[
				'114.webp',
				'Bathonien–Oxfordien'
			],
			[
				'115.webp',
				'Dogger'
			],
			[
				'116.webp',
				'Lias'
			],
			[
				'117.webp',
				'Trias–Dogger'
			],
			[
				'118.webp',
				'Trias'
			],
			[
				'119.webp',
				'Perm («Verrucano»)'
			],
			[
				'120.webp',
				'Oberkarbon (?–Unterperm)'
			],
			[
				'121.webp',
				'Devon–Unterkarbon'
			]
		]
	},
	{
		'name': '第四系',
		'items': [
			[
				'122.webp',
				'Alluvionen'
			],
			[
				'123.webp',
				'Torf'
			],
			[
				'124.webp',
				'Schuttkegel'
			],
			[
				'125.webp',
				'Hangschutt'
			],
			[
				'126.webp',
				'Postglaziale Bergsturzmasse'
			],
			[
				'127.webp',
				'Sackungsmasse'
			],
			[
				'128.webp',
				'Rutschmasse'
			],
			[
				'129.webp',
				'Spät- bis postglaziale Schotter in den Alpen'
			],
			[
				'130.webp',
				'Jungpleistozäne Bergsturzmasse'
			],
			[
				'131.webp',
				'Löss, Lösslehm, Verwitterungslehm'
			],
			[
				'132.webp',
				'Fluvioglaziale und glaziolakustrische Schotter (Hoch- und Niederterrassen)'
			],
			[
				'133.webp',
				'Moräne, mit Wall; inkl. rezente Moräne'
			],
			[
				'134.webp',
				'Moränenwall in See'
			],
			[
				'135.webp',
				'Ältere fluvioglaziale Schotter (Deckenschotter)'
			]
		]
	},
	{
		'name': '火成岩：中生代・第三紀（アルプス）',
		'items': [
			[
				'136.webp',
				'Neogene Ergussgesteine: Phonolithe'
			],
			[
				'137.webp',
				'Neogene Ergussgesteine: Olivin-Nephelinite'
			],
			[
				'138.webp',
				'Neogene Ergussgesteine: Pyroklastika (Deckentuffe)'
			],
			[
				'139.webp',
				'Oligozäne Ergussgesteine: Rhyolithe, Trachiandesite, Andesite'
			],
			[
				'140.webp',
				'Tertiäre Intrusiva: Granite, Granodiorite'
			],
			[
				'141.webp',
				'Tertiäre Intrusiva: Tonalite, Diorite, Gabbros'
			]
		]
	},
	{
		'name': '古生代以降の岩脈・中生代のオフィオライト',
		'items': [
			[
				'142.webp',
				'Postpaläozoische Ganggesteine: Basische Ganggesteine'
			],
			[
				'143.webp',
				'Mesozoische Ophiolithe: Basaltische und metabasaltische Gesteine'
			],
			[
				'144.webp',
				'Mesozoische Ophiolithe: Metagabbroide und eklogitische Gesteine'
			],
			[
				'145.webp',
				'Mesozoische Ophiolithe: Meta-Ultrabasite (Serpentinite, Talkschiefer; z.T. subkontinentaler Mantel)'
			]
		]
	},
	{
		'name': '後期古生代（バリスカン期）の火成岩',
		'items': [
			[
				'146.webp',
				'Effusiva: Rhyolithe, Dacite (inkl. Ignimbrite, Granophyre)'
			],
			[
				'147.webp',
				'Effusiva: Andesite, Basalte'
			],
			[
				'148.webp',
				'Ganggesteine (ausseralpin): Granitporphyre, Granophyre'
			],
			[
				'149.webp',
				'Intrusiva (Alpen), Perm: Granite, Granodiorite, Quarzdiorite'
			],
			[
				'150.webp',
				'Intrusiva (Alpen), Mittel- bis Oberkarbon: Granite, Granodiorite, Quarzdiorite'
			],
			[
				'151.webp',
				'Intrusiva (Alpen), Mittel- bis Oberkarbon: Syenite, Monzonite'
			],
			[
				'152.webp',
				'Intrusiva (Alpen), Mittel- bis Oberkarbon: Diorite, Gabbros'
			],
			[
				'153.webp',
				'Intrusiva (Alpen): Ultrabasite'
			],
			[
				'154.webp',
				'Intrusiva (Schwarzwald): Granite (spät- bis postkinematisch)'
			],
			[
				'155.webp',
				'Intrusiva (Schwarzwald): Granite, migmatitische Granitoide (früh- bis synkinematisch)'
			],
			[
				'156.webp',
				'Intrusiva (Schwarzwald): Granodiorite, Tonalite (z.T. anatektisch)'
			],
			[
				'157.webp',
				'Intrusiva (Vogesen): Quarzmonzonite (inkl. basischere Randfazies)'
			]
		]
	},
	{
		'name': '中生代以前の高度変成岩',
		'items': [
			[
				'158.webp',
				'Metagranitoide (Intrusionsalter nicht gesichert)'
			],
			[
				'159.webp',
				'Metagranitoide, jungpaläozoisches (variszisches) Intrusionsalter'
			],
			[
				'160.webp',
				'Diatexite, Syntexite (Schwarzwald)'
			],
			[
				'161.webp',
				'Metagranitoide, altpaläozoisches (kaledonisches) Intrusionsalter'
			],
			[
				'162.webp',
				'Metaperidotite'
			],
			[
				'163.webp',
				'Metagabbros, Metabasalte (z.T. eklogitfaziell); Meta-Ultrabasite'
			],
			[
				'164.webp',
				'Amphibolite'
			],
			[
				'165.webp',
				'Gneise und Glimmerschiefer (inkl. Migmatite und Phyllite; vorw. Metasedimente)'
			],
			[
				'166.webp',
				'Quarzphyllit-Serien'
			],
			[
				'167.webp',
				'Glimmerschiefer und Paragneise mit Marmoren, Kalksilikatgesteinen, Amphiboliten und Pegmatiten der Tonale-Serie und der Scisti di Fobello e Rimella'
			],
			[
				'168.webp',
				'Kinzigitgneise'
			],
			[
				'169.webp',
				'Einlagerungen von Marmoren und Kalksilikatfelsen'
			],
			[
				'170.webp',
				'Mylonite der Ivrea-Zone'
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
