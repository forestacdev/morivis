export type WoodStructure =
	| '環孔材'
	| '散孔材'
	| '半環孔材'
	| '放射孔材'
	| '針葉樹'
	| '裸子植物材'
	| '無道管広葉樹';

export interface TimberSpecies {
	id: number;
	nameJa: string;
	nameEn: string;
	scientificName: string;
	airDryDensity: number | { min: number; max: number };
	woodStructure: WoodStructure;
	hardness: '軽軟' | '中庸' | '重硬' | '極重硬';
	summary: string;
	characteristics: string[];
	uses: string[];
}

export const timberSpecies: TimberSpecies[] = [
	{
		id: 1,
		nameJa: 'ブナ',
		nameEn: 'Japanese Beech',
		scientificName: 'Fagus crenata',
		airDryDensity: 0.676,
		woodStructure: '散孔材',
		hardness: '重硬',
		summary: '蒸気による曲げ木加工性に優れ、北欧家具や子供椅子の材料として広く用いられる。',
		characteristics: ['均質', '粘り強い', '曲げ木加工に最適', '乾燥時収縮大'],
		uses: ['曲げ木椅子', '北欧家具', '木製玩具', '子供椅子', '木杓子']
	},
	{
		id: 2,
		nameJa: 'アオダモ（トネリコ属）',
		nameEn: 'Japanese Ash',
		scientificName: 'Fraxinus lanuginosa',
		airDryDensity: { min: 0.62, max: 0.84 },
		woodStructure: '環孔材',
		hardness: '重硬',
		summary:
			'トネリコ属のうちアオダモは、弾力性と靭性を持つやや重硬な環孔材で、野球バットなど衝撃を受ける運動具に用いられてきた。',
		characteristics: ['弾力性がある', '靭性が高い', '環孔材で年輪が明瞭', '曲げ木適性がある'],
		uses: ['野球バット', 'スポーツ用品', '工具柄', '器具材']
	},
	{
		id: 3,
		nameJa: 'ウリハダカエデ',
		nameEn: 'Urihada Maple',
		scientificName: 'Acer rufinerve',
		airDryDensity: 0.535,
		woodStructure: '散孔材',
		hardness: '中庸',
		summary:
			'白く清潔感ある材色と柔らかな刃当たりを持ち、箸や編み組材として一部地域の伝統工芸を支えてきた軽中庸の広葉樹。',
		characteristics: ['白く清潔感ある材色', '緻密', '刃当たり柔らか'],
		uses: ['箸（シラハシ）', '縄', '蓑', '経木', '笠', '籠']
	},
	{
		id: 4,
		nameJa: 'ケヤキ',
		nameEn: 'Japanese Zelkova',
		scientificName: 'Zelkova serrata',
		airDryDensity: 0.698,
		woodStructure: '環孔材',
		hardness: '重硬',
		summary: '木目が明瞭で耐朽性が高く、寺院建築の構造材から山中漆器の木地まで幅広く用いられる。',
		characteristics: ['ダイナミックな木目', '玉杢・如輪杢', '耐朽性高', '深い光沢'],
		uses: ['大黒柱', '梁', '床の間', '玄関式台', '山中漆器木地椀', '薄挽きカップ', '寺院の厨子']
	},
	{
		id: 5,
		nameJa: 'イタヤカエデ',
		nameEn: 'Painted Maple',
		scientificName: 'Acer pictum subsp. mono',
		airDryDensity: 0.641,
		woodStructure: '散孔材',
		hardness: '重硬',
		summary:
			'精緻な肌目と高い耐摩耗性を持ち、木工作業台の天面や積み木など精度と耐久性が求められる用途に用いられる。',
		characteristics: ['精緻な肌目', '摩耗に強い', '衝撃耐性高', '塗装乗り良好'],
		uses: ['木工作業台天面', '曲物', 'スプーン', '積み木', '木製玩具']
	},
	{
		id: 6,
		nameJa: 'ケンポナシ',
		nameEn: 'Oriental Raisin Tree',
		scientificName: 'Hovenia dulcis',
		airDryDensity: 0.686,
		woodStructure: '環孔材',
		hardness: '重硬',
		summary:
			'ケヤキに似た黄褐色の落ち着いた木目を持ちながら乾燥後の狂いが少なく、椅子の構造材として強度と意匠性のバランスに優れる。',
		characteristics: ['黄褐色から褐色', '乾燥による狂い少', '仕上がり良好'],
		uses: ['椅子構造材', '現代家具']
	},
	{
		id: 7,
		nameJa: 'ソメイヨシノ',
		nameEn: 'Yoshino Cherry',
		scientificName: 'Prunus × yedoensis',
		airDryDensity: { min: 0.48, max: 0.74 },
		woodStructure: '散孔材',
		hardness: '中庸',
		summary:
			'主に観賞樹として植栽されるサクラで、木材としての流通は多くない。材質はサクラ類に準じ、赤褐色を帯び、肌目が精で、器・小物・家具部材など手触りを重視する用途に使われることがある。',
		characteristics: ['赤褐色を帯びる', '肌目が精', '仕上がりが滑らか', '流通量は限定的'],
		uses: ['器', '小物', 'スプーン', '家具部材']
	},
	{
		id: 8,
		nameJa: 'シラカシ（柾目）',
		nameEn: 'Bamboo-leaf Oak (quarter-sawn)',
		scientificName: 'Quercus myrsinifolia',
		airDryDensity: { min: 0.74, max: 1.02 },
		woodStructure: '放射孔材',
		hardness: '極重硬',
		summary:
			'シラカシは日本産材の中でも特に重硬な部類に入るカシ類で、柾目面では大きな放射組織による落ち着いた表情が現れる。強靭さを生かし、鉋台・木槌・道具柄などに用いられてきた。',
		characteristics: ['非常に重硬', '強靭', '大きな放射組織を持つ', '乾燥・加工は難しい'],
		uses: ['木槌', '鉋台', '道具柄', '木刀', '器具材']
	},
	{
		id: 9,
		nameJa: 'ミズメ',
		nameEn: 'Japanese Cherry Birch',
		scientificName: 'Betula grossa',
		airDryDensity: 0.69,
		woodStructure: '散孔材',
		hardness: '重硬',
		summary: '均質で緻密な構造と磨いたときの光沢を持ち、松本民芸家具や山中漆器の木地に用いられる。',
		characteristics: ['均質', '緻密', 'サリチル酸メチルの香り', '磨くと光沢'],
		uses: ['松本民芸家具', '山中漆器木地', '重厚な家具']
	},
	{
		id: 10,
		nameJa: 'カラマツ',
		nameEn: 'Japanese Larch',
		scientificName: 'Larix kaempferi',
		airDryDensity: 0.49,
		woodStructure: '針葉樹',
		hardness: '中庸',
		summary: '日本の落葉針葉樹で、樹脂が多く耐朽性に優れ、現代家具や内装材にも用いられる。',
		characteristics: ['樹脂多い', '耐朽性高', '力強い木目', '螺旋木理（未乾燥時）'],
		uses: ['家具', '建築内装材', '電柱（旧来）', '土木材（旧来）']
	},
	{
		id: 11,
		nameJa: 'イチイ',
		nameEn: 'Japanese Yew',
		scientificName: 'Taxus cuspidata',
		airDryDensity: 0.545,
		woodStructure: '針葉樹',
		hardness: '中庸',
		summary:
			'細かい年輪と濃赤褐色の心材を持つ針葉樹材で、耐久性が高く切削しやすい。飛騨高山の一位一刀彫をはじめ、細工物・彫刻・床柱などに用いられてきた。',
		characteristics: [
			'年輪が細かい',
			'心材は濃赤褐色',
			'心辺材の境界が明瞭',
			'耐久性が高い',
			'切削しやすい'
		],
		uses: ['一位一刀彫', '彫刻', '細工物', '床柱', '笏']
	},
	{
		id: 12,
		nameJa: 'ヤマハンノキ',
		nameEn: 'Manchurian Alder',
		scientificName: 'Alnus hirsuta',
		airDryDensity: 0.509,
		woodStructure: '散孔材',
		hardness: '中庸',
		summary:
			'比較的軽軟で均質な加工しやすい材で、伐採直後にオレンジ色へ変化するユニークな特性を持ち、家具内部材や工作材料として用いられる。',
		characteristics: ['加工容易', '伐採直後オレンジ色に変化', '耐久性低'],
		uses: ['家具内部材', '工作材料', '鉛筆材（旧来）', 'パルプ用材（旧来）']
	},
	{
		id: 13,
		nameJa: 'カツラ',
		nameEn: 'Katsura',
		scientificName: 'Cercidiphyllum japonicum',
		airDryDensity: { min: 0.4, max: 0.66 },
		woodStructure: '散孔材',
		hardness: '軽軟',
		summary:
			'やや軽軟で肌目が精、加工しやすく仕上がりもよい材。家具の引き出し側板、裁ち板、碁盤・将棋盤、彫刻、器具など、安定した板物や加工性を生かす用途に用いられてきた。',
		characteristics: ['やや軽軟', '肌目が精', '加工容易', '仕上がり良好', '耐久性は低い'],
		uses: ['家具引き出し側板', '裁ち板', '製図板', '碁盤・将棋盤', '彫刻', '器具']
	},
	{
		id: 14,
		nameJa: 'トチノキ',
		nameEn: 'Japanese Horse Chestnut',
		scientificName: 'Aesculus turbinata',
		airDryDensity: 0.463,
		woodStructure: '散孔材',
		hardness: '軽軟',
		summary:
			'「縮み杢」と絹のような光沢が現れる美しい大径木で、幅広一枚板のテーブルや漆器椀の木地として高い評価を受けるが、乾燥管理に熟練を要する。',
		characteristics: ['縮み杢', '絹のような光沢', '加工容易', '乾燥時狂い大'],
		uses: ['一枚板テーブル', '飾り棚天板', '漆器椀', '大鉢木地']
	},
	{
		id: 15,
		nameJa: 'ヤマグワ（クワ）',
		nameEn: 'Mulberry',
		scientificName: 'Morus bombycis',
		airDryDensity: { min: 0.52, max: 0.75 },
		woodStructure: '環孔材',
		hardness: '重硬',
		summary:
			'心材は鮮やかな黄褐色から経年で濃褐色へ深まり、環孔材らしい明瞭な木目と美しい仕上がりを持つ。蓄積は少ないが、和家具・指物・茶道具・楽器・旋作物など装飾性を生かす用途に用いられてきた。',
		characteristics: [
			'心材は黄褐色から濃褐色',
			'環孔材で年輪が明瞭',
			'杢が現れることがある',
			'仕上がりが美しい',
			'耐久性が高い'
		],
		uses: ['江戸指物', '和家具', '茶道具', '鏡台', '楽器', '旋作物']
	},
	{
		id: 16,
		nameJa: 'クリ',
		nameEn: 'Japanese Chestnut',
		scientificName: 'Castanea crenata',
		airDryDensity: 0.479,
		woodStructure: '環孔材',
		hardness: '中庸',
		summary:
			'タンニンを多く含み耐水性と耐朽性が高く、建築土台や枕木、器、フローリングなどに用いられる。',
		characteristics: ['タンニン多含', '耐水性高', '耐朽性高', '力強い木目'],
		uses: ['建築土台', '鉄道枕木', '我谷盆', 'テーブル', 'フローリング', '椅子']
	},
	{
		id: 17,
		nameJa: 'イヌエンジュ',
		nameEn: 'Amur Maackia',
		scientificName: 'Maackia amurensis var. buergeri',
		airDryDensity: 0.64,
		woodStructure: '環孔材',
		hardness: '重硬',
		summary:
			'辺材の黄白色と心材の暗褐色の対比が明瞭な、やや重硬な環孔材。磨くと光沢が出て、心材の耐久性も高く、床柱・器具材・漆器木地・小物などに用いられる。',
		characteristics: [
			'心材は暗褐色',
			'辺材は黄白色',
			'やや重硬',
			'磨くと光沢',
			'心材の耐久性が高い'
		],
		uses: ['床柱', '器具材', '漆器木地', '旋作物', '小物']
	},
	{
		id: 18,
		nameJa: 'シイ',
		nameEn: 'Japanese Chinquapin',
		scientificName: 'Castanopsis spp.',
		airDryDensity: 0.568,
		woodStructure: '環孔材',
		hardness: '中庸',
		summary:
			'西日本の照葉樹林を代表する常緑広葉樹で、材は環孔材で年輪がはっきり見える。シイノキとコジイで材質差があり、耐久性は高くなく、狂いも出やすいため、建築内装・器具・ほだ木などの用途が中心となる。',
		characteristics: ['環孔材で年輪が明瞭', '肌目は粗い', '耐久性は低め', '狂いやすい'],
		uses: ['建築内装', '器具材', 'シイタケ原木', '薪炭材']
	},
	{
		id: 19,
		nameJa: 'シウリザクラ',
		nameEn: 'Miyama Cherry',
		scientificName: 'Prunus ssiori',
		airDryDensity: 0.66,
		woodStructure: '散孔材',
		hardness: '重硬',
		summary:
			'桜餅に似た香りと落ち着いた赤褐色を持つ寒冷地産のサクラで、寸法安定性が非常に高く定規や楽器（ピアノ外枠）など精度を要する用途に重宝される。',
		characteristics: ['桜餅の香り', '落ち着いた赤褐色', '寸法安定性高', '狂い少'],
		uses: ['定規類（木製スケール）', '高級家具', '楽器（ピアノ外枠）', '精密小物']
	},
	{
		id: 20,
		nameJa: 'ハリエンジュ（ニセアカシア）',
		nameEn: 'Black Locust',
		scientificName: 'Robinia pseudoacacia',
		airDryDensity: 0.719,
		woodStructure: '環孔材',
		hardness: '重硬',
		summary:
			'北米原産の帰化樹種で、重硬・高強度かつ耐朽性が非常に高い。黄緑色を帯びる心材を持ち、フェンス支柱・枕木・屋外材・工芸品・家具などに用いられてきた。',
		characteristics: ['重硬', '強度が高い', '耐朽性が非常に高い', '心材は黄緑色を帯びる'],
		uses: ['フェンス支柱', '枕木', '屋外材', '工芸品', '家具', 'フローリング']
	},
	{
		id: 21,
		nameJa: 'ミズナラ',
		nameEn: 'Mongolian Oak',
		scientificName: 'Quercus crispula',
		airDryDensity: { min: 0.67, max: 0.82 },
		woodStructure: '環孔材',
		hardness: '重硬',
		summary: '柾目面に虎斑が現れ、蒸気曲げ加工にも適し、木製家具に広く用いられる。',
		characteristics: ['虎斑（柾目）', '蒸気曲げ加工適性あり', '重硬'],
		uses: ['机', 'フローリング', '大黒柱', 'テーブル', '小物', '家具']
	},
	{
		id: 22,
		nameJa: 'シラカシ（板目）',
		nameEn: 'Bamboo-leaf Oak (flat-sawn)',
		scientificName: 'Quercus myrsinifolia',
		airDryDensity: { min: 0.74, max: 1.02 },
		woodStructure: '放射孔材',
		hardness: '極重硬',
		summary:
			'シラカシの板目材では、カシ類に特徴的な放射組織がごま状の模様として現れる。非常に重硬で強靭なため、鉋台・道具柄・木槌など、叩く・こする負荷を受ける道具に使われてきた。',
		characteristics: ['非常に重硬', '強靭', '板目面にカシ目が出る', '加工は難しい'],
		uses: ['鉋台', '木槌', '鉈の柄', '鎌の柄', '器具材']
	},
	{
		id: 23,
		nameJa: 'セン（ハリギリ）',
		nameEn: 'Castor Aralia',
		scientificName: 'Kalopanax septemlobus',
		airDryDensity: 0.595,
		woodStructure: '環孔材',
		hardness: '中庸',
		summary:
			'ケヤキに似た美しい木目を持ちながら広葉樹としては非常に軽量で加工性が高く、大型家具や突板の表面材として取り回しと美観を両立する。',
		characteristics: ['白く清潔感ある材色', '加工性極高', '比重の割に強度あり', '軽量'],
		uses: ['テーブル', '椅子', '大型家具', '突板']
	},
	{
		id: 24,
		nameJa: 'ヤマナシ',
		nameEn: 'Wild Pear',
		scientificName: 'Pyrus pyrifolia',
		airDryDensity: 0.747,
		woodStructure: '散孔材',
		hardness: '重硬',
		summary:
			'非常に精緻な肌目と高い物理的安定性を持つバラ科の重硬材で、版木・印鑑・秤など「狂い」と「摩耗」を嫌う精密な道具に多用されてきた。',
		characteristics: ['肌目非常に精緻', '物理的安定性高', '割れ・欠けにくい'],
		uses: ['秤の竿', '測量器具', '印鑑', '版木', '精密道具']
	},
	{
		id: 25,
		nameJa: 'ハルニレ',
		nameEn: 'Japanese Elm',
		scientificName: 'Ulmus japonica',
		airDryDensity: 0.666,
		woodStructure: '環孔材',
		hardness: '重硬',
		summary:
			'ハルニレは大きな道管が環状に並ぶため年輪が明瞭な、やや重硬の環孔材。曲木が可能で家具・器具・車両材などに用いられるが、耐久性は低めで加工はやや難しい。',
		characteristics: [
			'環孔材で年輪が明瞭',
			'やや重硬',
			'曲木可能',
			'耐久性は低め',
			'加工はやや難しい'
		],
		uses: ['家具', '器具材', '車両材', '内装材']
	},
	{
		id: 26,
		nameJa: 'ヤマザクラ',
		nameEn: 'Japanese Mountain Cherry',
		scientificName: 'Prunus jamasakura',
		airDryDensity: 0.594,
		woodStructure: '散孔材',
		hardness: '中庸',
		summary:
			'赤褐色の心材と精な肌目、加工性のよさを持つサクラ類の代表的な材。器具・家具・楽器・挽物・彫刻など、美観と手触りを生かす用途に用いられてきた。',
		characteristics: ['肌目が精', '赤褐色の心材', '仕上がりが滑らか', '加工しやすい'],
		uses: ['版木', '器具', '家具', '楽器', '挽物', '彫刻', 'スプーン']
	},
	{
		id: 27,
		nameJa: 'ウダイカンバ（マカンバ）',
		nameEn: 'Monarch Birch',
		scientificName: 'Betula maximowicziana',
		airDryDensity: { min: 0.5, max: 0.84 },
		woodStructure: '散孔材',
		hardness: '重硬',
		summary:
			'均質で重硬なカンバ類の代表材。耐摩耗性と平滑性に優れ、家具・床板・内装材・合板・器具材などに用いられる。',
		characteristics: ['均質', '重硬', '耐摩耗性が高い', '仕上がり良好'],
		uses: ['テーブル天板', '家具', '床板', '内装材', '合板', '器具材']
	},
	{
		id: 28,
		nameJa: 'センダン',
		nameEn: 'Chinaberry',
		scientificName: 'Melia azedarach',
		airDryDensity: 0.485,
		woodStructure: '環孔材',
		hardness: '軽軟',
		summary: '成長が早い早生樹で加工が容易であり、ケヤキに似た木目を持ち、家具や建具に用いられる。',
		characteristics: ['早生樹', '加工容易', 'ケヤキに似た木目'],
		uses: ['家具内部材', '小物', '建具']
	},
	{
		id: 29,
		nameJa: 'キハダ',
		nameEn: 'Amur Cork Tree',
		scientificName: 'Phellodendron amurense',
		airDryDensity: { min: 0.38, max: 0.57 },
		woodStructure: '環孔材',
		hardness: '軽軟',
		summary:
			'緑みを帯びた黄褐色の心材を持つ、やや軽軟な環孔材。年輪は明瞭で加工はしやすいが、耐久性は高くないため、家具・指物・器具・単板など屋内用途に向く。',
		characteristics: [
			'黄褐色から褐色',
			'環孔材で年輪が明瞭',
			'やや軽軟',
			'加工容易',
			'耐久性は低い'
		],
		uses: ['茶箪笥', '指物', '小箱', '家具', '器具材', '単板']
	},
	{
		id: 30,
		nameJa: 'オニグルミ',
		nameEn: 'Japanese Walnut',
		scientificName: 'Juglans sieboldiana',
		airDryDensity: { min: 0.42, max: 0.7 },
		woodStructure: '散孔材',
		hardness: '中庸',
		summary:
			'落ち着いた褐色の心材を持つ中庸な材で、狂いが少なく靭性があり、加工性と仕上がりも良好。家具・フローリング・器具・彫刻などに用いられる。',
		characteristics: ['中庸な硬さ', '狂いが少ない', '靭性がある', '加工容易', '仕上がり良好'],
		uses: ['椅子座面', '家具', 'フローリング', '器具材', '彫刻']
	},
	{
		id: 31,
		nameJa: 'スギ',
		nameEn: 'Japanese Cedar',
		scientificName: 'Cryptomeria japonica',
		airDryDensity: 0.376,
		woodStructure: '針葉樹',
		hardness: '軽軟',
		summary:
			'日本の建築文化の基盤を担う極軽軟の針葉樹で、優れた断熱・吸放湿性を持ち、圧縮技術の進化により家具への応用範囲も飛躍的に拡大している。',
		characteristics: ['極軽軟', '断熱性高', '吸放湿性高', '温かみある触感'],
		uses: ['建築材', '曲物', 'フローリング', '柱', '家具', '遊具']
	},
	{
		id: 32,
		nameJa: 'シナノキ',
		nameEn: 'Japanese Linden',
		scientificName: 'Tilia japonica',
		airDryDensity: 0.477,
		woodStructure: '散孔材',
		hardness: '軽軟',
		summary:
			'組織が均一でどの方向からも削りやすく、彫刻材として用いられるほか、樹皮繊維はアイヌの伝統織物にも使われる。',
		characteristics: ['組織極めて均一', '全方向から均等に削れる', '彫刻との相性抜群'],
		uses: ['彫刻', '建具', '天井板', 'アイヌの伝統織物（樹皮繊維）']
	},
	{
		id: 33,
		nameJa: 'ヒノキ',
		nameEn: 'Japanese Cypress',
		scientificName: 'Chamaecyparis obtusa',
		airDryDensity: 0.422,
		woodStructure: '針葉樹',
		hardness: '軽軟',
		summary:
			'精油成分による抗菌性、防虫性、芳香性と高い耐水性を持ち、寺院建築から日用品まで幅広く用いられる。',
		characteristics: ['緻密', '抗菌・防虫・芳香作用', '水湿に極強', '精油成分豊富'],
		uses: ['寺院建築', '造作材', '風呂材', '箸', '下駄', '玩具']
	},
	{
		id: 34,
		nameJa: 'アカマツ',
		nameEn: 'Japanese Red Pine',
		scientificName: 'Pinus densiflora',
		airDryDensity: 0.567,
		woodStructure: '針葉樹',
		hardness: '中庸',
		summary:
			'松脂を多く含み耐水性と粘り強さに優れた針葉樹で、土中杭や梁などの横架材として卓越した性能を発揮し、力強い木目を活かした小物にも用いられる。',
		characteristics: ['松脂多含', '耐水性高', '強靭な粘り'],
		uses: ['土中杭', '梁', '桁', '小皿', '椅子', '塀']
	},
	{
		id: 35,
		nameJa: 'ホオノキ',
		nameEn: 'Japanese Magnolia',
		scientificName: 'Magnolia obovata',
		airDryDensity: 0.466,
		woodStructure: '散孔材',
		hardness: '軽軟',
		summary:
			'均質な緑色の材で狂いが非常に少なく刃物を傷めない成分特性を持ち、まな板・菓子型・日本刀の鞘など精密な削り出しが必要な道具の独壇場。',
		characteristics: ['均質な緑色', '狂い非常に少', '刃物を傷めない'],
		uses: ['まな板', '菓子型', '日本刀の鞘', '下駄の歯（朴歯）', '杓子']
	},
	{
		id: 36,
		nameJa: 'イチョウ',
		nameEn: 'Ginkgo',
		scientificName: 'Ginkgo biloba',
		airDryDensity: 0.55,
		woodStructure: '裸子植物材',
		hardness: '中庸',
		summary:
			'イチョウは裸子植物で、材は道管を持たず針葉樹材に近い構造を持つ。均質で肌目が精、加工しやすく仕上がりもよいため、まな板・碁盤・将棋盤・彫刻・漆器木地などに用いられてきた。',
		characteristics: ['裸子植物材', '道管を持たない', '均質', '肌目が精', '加工しやすい'],
		uses: ['まな板', '碁盤', '将棋盤', '彫刻', '漆器木地']
	},
	{
		id: 37,
		nameJa: 'キリ',
		nameEn: 'Paulownia',
		scientificName: 'Paulownia tomentosa',
		airDryDensity: { min: 0.19, max: 0.4 },
		woodStructure: '半環孔材',
		hardness: '軽軟',
		summary:
			'日本産木材の中でも特に軽軟な材で、加工が容易で寸法安定性が高い。箪笥・箱・建具・琴など、軽さと安定性を生かす用途に用いられてきた。',
		characteristics: ['非常に軽軟', '加工容易', '寸法安定性が高い', '断熱性が高い'],
		uses: ['桐タンス', '箱', '建具', '琴', '彫刻', '下駄']
	},
	{
		id: 38,
		nameJa: 'オオウラジロノキ（ヤマズミ）',
		nameEn: "Tschonoski's Crabapple",
		scientificName: 'Malus tschonoskii',
		airDryDensity: 0.859,
		woodStructure: '散孔材',
		hardness: '極重硬',
		summary:
			'日本産のリンゴ属樹木で、材木としての流通は少ないが、密で硬い材として家具部材や椅子の脚・スピンドルなどに用いられる作例がある。',
		characteristics: ['材は密で硬い', '流通量は少ない', '小径材中心', '家具部材への作例がある'],
		uses: ['椅子脚部', 'スピンドル', '家具部材', '小物']
	},
	{
		id: 39,
		nameJa: 'ヤナギ',
		nameEn: 'Willow',
		scientificName: 'Salix spp.',
		airDryDensity: 0.317,
		woodStructure: '散孔材',
		hardness: '軽軟',
		summary: '軽くて繊維が強靭で折れにくく、曲げ適性が高いため、編み座や柳行李などに用いられる。',
		characteristics: ['極軽軟', '繊維強靭で折れにくい', '曲げ適性高'],
		uses: ['編み座（椅子）', '柳行李', '編み組工芸']
	},
	{
		id: 40,
		nameJa: 'イヌマキ',
		nameEn: 'Japanese Yew Plum Pine',
		scientificName: 'Podocarpus macrophyllus',
		airDryDensity: { min: 0.48, max: 0.65 },
		woodStructure: '針葉樹',
		hardness: '重硬',
		summary:
			'針葉樹としてはやや重く硬い材で、耐久性が高く、白蟻に対する抵抗性もあるとされる。沖縄など白蟻被害の多い地域では建築材として重宝されてきた。',
		characteristics: [
			'針葉樹としてはやや重硬',
			'耐久性が高い',
			'白蟻に対する抵抗性がある',
			'湿気に強い'
		],
		uses: ['建築材', '器具材', '構造材']
	},
	{
		id: 41,
		nameJa: 'エノキ',
		nameEn: 'Japanese Hackberry',
		scientificName: 'Celtis sinensis',
		airDryDensity: 0.613,
		woodStructure: '環孔材',
		hardness: '中庸',
		summary:
			'ケヤキに似た木目を持ちながら乾燥時の狂いが出やすい欠点があり、ケヤキ代用材や道具の柄・まな板など身近な雑用材として人々の暮らしを陰で支えてきた。',
		characteristics: ['ケヤキに似た木目', '乾燥時狂い出やすい'],
		uses: ['ケヤキ代用材', '道具の柄', 'まな板', '雑用材']
	},
	{
		id: 42,
		nameJa: 'ツガ',
		nameEn: 'Southern Japanese Hemlock',
		scientificName: 'Tsuga sieboldii',
		airDryDensity: { min: 0.45, max: 0.6 },
		woodStructure: '針葉樹',
		hardness: '中庸',
		summary:
			'針葉樹材としては比較的重硬で、建築材・建具材・器具材などに用いられてきた。耐久性は中庸で、構造用途では材の等級や品質を確認して使う必要がある。',
		characteristics: ['針葉樹としては重硬', '年輪が明瞭', '耐久性は中庸', '乾燥は比較的容易'],
		uses: ['建築材', '建具材', '長押', '敷居', '鴨居', '器具材']
	},
	{
		id: 44,
		nameJa: 'クスノキ',
		nameEn: 'Camphor Tree',
		scientificName: 'Cinnamomum camphora',
		airDryDensity: 0.488,
		woodStructure: '散孔材',
		hardness: '軽軟',
		summary:
			'材全体から漂う樟脳の強烈な香りが虫を寄せ付けず、自然の防虫剤として機能するためタンスの内部材や衣装箱に多用される化学的防御に優れた材。',
		characteristics: ['樟脳の香り', '防虫性高'],
		uses: ['タンスの内部材', '衣装箱']
	},
	{
		id: 45,
		nameJa: 'ミズキ',
		nameEn: 'Giant Dogwood',
		scientificName: 'Cornus controversa',
		airDryDensity: 0.638,
		woodStructure: '散孔材',
		hardness: '重硬',
		summary: '白い材色と均質で緻密な肌目を持ち、鳴子こけしや漆器木地、箸などに用いられる。',
		characteristics: ['雪のような白さ', '均質', '加工容易', '塗装仕上がり極良'],
		uses: ['鳴子こけし', '漆器木地', '箸', '杓子']
	},
	{
		id: 46,
		nameJa: 'コウヨウザン',
		nameEn: 'China Fir',
		scientificName: 'Cunninghamia lanceolata',
		airDryDensity: 0.334,
		woodStructure: '針葉樹',
		hardness: '軽軟',
		summary:
			'早生樹としての高い生産性と軽量ながらヤング係数が高い力学特性を兼ね備え、構造用合板としての適性が非常に高い次世代の建材候補。',
		characteristics: ['軽量', 'ヤング係数高', '構造用合板適性高'],
		uses: ['構造用合板', '建材']
	},
	{
		id: 47,
		nameJa: 'ヤマグルマ',
		nameEn: 'Wheel Tree',
		scientificName: 'Trochodendron aralioides',
		airDryDensity: { min: 0.75, max: 1.02 },
		woodStructure: '無道管広葉樹',
		hardness: '極重硬',
		summary:
			'ヤマグルマは広葉樹でありながら道管を持たない特殊な材構造を持つ。緻密で重硬な材として知られ、木刀や器具材など硬さと粘りを求める用途に用いられてきた。',
		characteristics: ['道管を持たない', '仮道管主体の特殊な材構造', '緻密', '重硬'],
		uses: ['木刀', '器具材', '小物']
	}
];
