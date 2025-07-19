import { FEATURE_IMAGE_BASE_PATH } from '$routes/constants';

export interface PropData {
	[id: string]: {
		image: string | null;
		description: string | null;
		url: string | null;
	};
}

export const propData: PropData = {
	// ポール
	pole_1: {
		image: `${FEATURE_IMAGE_BASE_PATH}/pole_1.webp`,
		description: '',
		url: null
	},
	pole_2: {
		image: `${FEATURE_IMAGE_BASE_PATH}/pole_2.webp`,
		description: '',
		url: null
	},
	pole_3: {
		image: `${FEATURE_IMAGE_BASE_PATH}/pole_3.webp`,
		description: '',
		url: null
	},
	pole_4: {
		image: `${FEATURE_IMAGE_BASE_PATH}/pole_4.webp`,
		description: '',
		url: null
	},
	pole_5: {
		image: `${FEATURE_IMAGE_BASE_PATH}/pole_5.webp`,
		description: '',
		url: null
	},
	pole_6: {
		image: `${FEATURE_IMAGE_BASE_PATH}/pole_6.webp`,
		description: '',
		url: null
	},
	pole_a: {
		image: `${FEATURE_IMAGE_BASE_PATH}/pole_a.webp`,
		description: '',
		url: null
	},
	// アカデミー施設
	fac_center: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_center.webp`,
		description: `アカデミーの玄関であるエントランスホールからテクニカルゾーン、宿泊ゾーン、森の体験ゾーンへと繋がっていきます。
                        ここには講義室や事務室、ゆったりとした学生ホールなどを備えています。`,
		url: 'https://www.forest.ac.jp/facilities/centerzone/'
	},
	fac_cottage: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_cottage.webp`,
		description: `ゲストや研修・講座受講者のための宿泊施設六角形ユニットで構成され、大小様々な部屋が15部屋あり、最大30人が利用できます。
                        厨房、食堂、洗面所、共同浴室、談話室も備えています。`,
		url: 'https://www.forest.ac.jp/facilities/stay/'
	},
	fac_forest_labo: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_forest_labo.webp`,
		description: `情報システムを支える情報処理室や数多くの関連図書を保有する図書室を備えます。
                このほか、森の分野と環境の分野に関連する研究施設を備えています。`,
		url: 'https://www.forest.ac.jp/facilities/centerzone/'
	},
	fac_kakoutou: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_kakoutou.webp`,
		description: '',
		url: null
	},
	fac_kensyutou: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_kensyutou.webp`,
		description: '',
		url: null
	},
	fac_koubou: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_koubou.webp`,
		description: `一般県民向けの木工講座などをサポートする施設工作に関するさまざまな木工機械などを備えています`,
		url: 'https://www.forest.ac.jp/facilities/testroom/'
	},
	fac_morinos: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_morinos.webp`,
		description: `すべての人と森をつなぎ、森と暮らす楽しさと森林文化の豊かさを次世代に伝えていく「森の入り口」森林総合教育センターです。`,
		url: 'https://morinos.net/'
	},
	fac_open_labo: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_open_labo.webp`,
		description: '',
		url: 'https://www.forest.ac.jp/facilities/testroom/'
	},
	fac_ringyoukikaitou: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_ringyoukikaitou.webp`,
		description: `高性能林業機械を格納し、その技術を学ぶための学習施設`,
		url: 'https://www.forest.ac.jp/facilities/fmeb/'
	},
	fac_seizaitou: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_seizaitou.webp`,
		description: '',
		url: 'https://www.forest.ac.jp/facilities/testroom/'
	},
	fac_syako: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_syako.webp`,
		description: '',
		url: null
	},
	fac_wood_labo: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_wood_labo.webp`,
		description:
			'木造建築スタジオや作業室、塗装・乾燥室など木の分野に関連する施設を備えています。２棟を繋ぐように大きな作業デッキが前面に広がります。',
		url: 'https://www.forest.ac.jp/facilities/centerzone/'
	},
	fac_tech_a: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_tech_a.webp`,
		description:
			'研修施設と高性能林業機械の保管庫を備える施設前面の広大な実習用グラウンドと合わせて森林技術者のための短期技術研修部門のエリア、テクニカルゾーンを構成します。',
		url: 'https://www.forest.ac.jp/facilities/technicalzone/'
	},
	fac_tech_b: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_tech_b.webp`,
		description:
			'研修施設と高性能林業機械の保管庫を備える施設前面の広大な実習用グラウンドと合わせて森林技術者のための短期技術研修部門のエリア、テクニカルゾーンを構成します。',
		url: 'https://www.forest.ac.jp/facilities/technicalzone/'
	},
	fac_information: {
		image: `${FEATURE_IMAGE_BASE_PATH}/fac_information.webp`,
		description:
			'一般県民向け生涯学習講座のための施設。広いスペースを設け各種講座をサポートします。',
		url: 'https://www.forest.ac.jp/facilities/forest/'
	},
	// 自力建設
	ziriki_01: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_01.webp`,
		description:
			'アカデミー演習林内の松跡平に造られた八畳の休憩小屋。構造材は全て四寸角(120mm角)で構成され、雨水を集めるように傘をひっくり返したような逆方形の屋根が特徴となっている。内部には可動式のベンチと囲炉裏が設置されている。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_02: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_02.webp`,
		description:
			'「みさきのちゃや」の主用途は、地域の子供たちを対象にした“環境教育プログラムキャンプ”における屋外厨房である。日本の多くの屋外厨房はカレーライスやバーべキュ－にしか対応していないが、ここでは家庭で行われる炊事に関して全て対応できるようになっている。未来を担う子供たちがこの「みさきのちゃや」で何かを感じてくれるとうれしく思う。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_03: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_03.webp`,
		description:
			'緑豊かな国、日本。国土の２／３は森林が占める。しかし外材普及率は８０％を越え、国内の林業は不振に喘いでいる。そんな中で国産材の活用が叫ばれ、その解決の一端を担うと考えられるのが、今回のテーマ、木材の乾燥である。活木処に求められたもの、それは自然のエネルギーを利用した木材の乾燥であった。利用者の要望にかないつつ、木材にとっても周辺環境にとっても、理想的な乾燥方法をここで模索し、実践することを目的とする。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_04: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_04.webp`,
		description:
			'環境教育研究会の提供するカリキュラムには、グループカウンセリングやワークショップ論という科目がある。少人数で集い、寝食を共にし、何かをつくり上げていく集中講義である。このような活動にふさわしい場の提供の他、夏の子どものキャンプ、普段からの学生の利用も可能な多目的空間としてのあり方も求められた。10人程度が生火を見ながら円く座れるという要望を満たすと同時に多目的に利用が可能な空間をつくること、また、機械に頼った生活を見直し、本来の体と心の調節機能を回復させるため、自然環境から多くのものを取り込むことを考えた。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_05: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_05.webp`,
		description:
			'自転車通学できる距離に住んでいても便利さにひかれ自動車通学する学生が少なくない。また、美濃市周辺及び校内も自転車利用者にとって快適な環境であるとは言い難い。そこで、省エネかつ健康的な自転車利用生活を楽しめる、そんな魅力的な空間、「アカデミー駐輪場」を建設しようということになった。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_06: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_06.webp`,
		description:
			'学内では実習が多く、汗をかいたり汚れたりすることが頻繁にある。実習の後、汗や汚れを簡単に洗い流し、その後の講義やゼミにリフレッシュした気持ちで参加したいという希望と、アカデミーで実施される地域のこどもたち対象のキャンプなどでコテージに完備された浴室を利用するだけでなく、森の中の「シャワー室」を利用することで環境教育をさらに有意義なものにしたいという目的から森のシャワー室を建設することになった。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_07: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_07.webp`,
		description:
			'学内に配されたネイチャートレイル（自然の小道）上にはフォリーが点在しているが、活用されずに放置された最後の「黒の迷路」を自力建設により浮き彫りにしたい。　 そこで、「黒の迷路」の活用、この建物が建つレベルから一段上がったフィールドをつなぐ階段の機能、そしてフィールドで行われる炭焼き体験時等の休憩場所としての機能を併せ持った、「連結施設」を建設する。　あわせて、この連結施設も含まれることになるネイチャートレイルを学内に形成し、環境教育に活用することを目的とする。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_08: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_08.webp`,
		description:
			'アカデミー校内を流れる小川の上に、学生会室を建設した。 アカデミー校舎のモチーフの格子を入れることで、構造性能を担保しながら、内部と外部を緩やかにつなぎ、木漏れ日などが室内に入り込む。夜は、格子から光が漏れ活動が灯る。 鉄筋コンクリート造（RC造）の基礎から鉄骨（S造）の片持ち張りを跳ね出し、木造の小屋を上部つくるという各構造を活かした混構造の建物となった。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_09: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_09.webp`,
		description:
			'半屋外の活動の場として、コナラの木々の間に建設した。詰めれば20人程度が入ることができる。テクニカルセンターとコテージの中間に位置し、ここで行われる活動は行き来する人々の目に留まる。自然観察の拠点に、ある時は森のようちえんの活動が行われ、雨の際は避難場所として活用される。 ３段に作られた屋根が空間にメリハリを、台形の床が方向性を与えて、自然に視線の方向が決まる。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_10: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_10.webp`,
		description:
			'2002年度の「みさきのちゃや」のデッキは風雨にさらされて劣化したため、外部デッキの改修に加えたバイオマストイレとして建設した。 デッキの劣化の原因を解体しながら研究し、その対応策として、いくつかの工夫を凝らして階段状にデッキを再構築した。 バイオマストイレは、おが粉と糞尿を混ぜることで、たい肥化を行う。 きちんと発酵させれば匂いも少なく、清潔感が保たれる。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_11: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_11.webp`,
		description:
			'校内の複雑な建物の動線を整理すべく、校内の中心にシンボリックな建物を計画した。半円形の持ち上がったデッキのある特徴的な建物で、目印となる。 デッキに上がると、樹冠の高さまで視線が上がり、自然観察の場となったり、見晴らしの良い景色を見ながら昼食をとる場にもなる。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_12: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_12.webp`,
		description:
			'アカデミーの入り口にそびえるアカデミーのサイン計画を兼ねた建物である。 内部は複雑に組まれたトラス材があたかも枝のように張り巡らされそこを通る光が木漏れ日のように映える。 来校者の一番最初に目に留まる建物である。 塔の下をくぐれば、散策路とつながるゲートの役割もはたす。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_13: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_13.webp`,
		description:
			'アカデミーセンターとマルチメディア実習等をつなぐ渡り廊下を建設した。 学生が行き来する中心的な位置関係から、茶の間のようにくつろいで交流がはかれるように、ベンチは、お盆なども設置し、季節の良い時には学生が語らう姿が見れる。 壁のない構造ながら、安全性を確保すべく、木質ラーメン構法と、樹状に跳ね出した方杖によって開放的な建物となった。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_14: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_14.webp`,
		description:
			'森林文化を象徴する「森のあかり」をコンセプトとした高さ10Ｍの木造灯台である。 日が暮れると上部にあかりが灯る。 ”清流の国ぎふ”には、舟運の拠点として川に灯台がつくられてきた歴史がある。 長良川河川敷に現存する「川湊灯台」（県指定史跡）をモチーフに、私たちは森林を舞台に灯台を建設した。 アカデミーのランドマークとして、演習林”山の神”が地上に降りてくる宿り木となるよう、 建物中央に高さ８Ｍの桧の「心柱」を据え付けている。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_15: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_15.webp`,
		description:
			'現代の杣人のための小屋 演習林を利用する人、森が好きな人、そういった現代の杣人にとっての”hut(小屋)”であり、日差や雨から守ってくれる”hat(ひさしのある帽子)”のような建物。 山側から降りてくる人を受け止めるような形状と庇を持ち、周囲の自然とは格子を用いて緩やかに区切る。 土地にもともとあったもの（岩、木材、樹木）も利用し建物とその周りの環境をつなげることに生かしていった。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_16: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_16.webp`,
		description:
			'自然体験活動の拠点となる炊事場。 森のようちえんやプレーパークなどの子供たちも含め、アカデミー学生も活用し、オアシスとなるような水場。 丸太も用いた樹状トラス構造を構造解析で説き、複雑ながらも力強く利用者を包み込む自然な造形となっている。屋根は２枚の葉をモチーフに、雨水を集める仕掛けを施している。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_17: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_17.webp`,
		description:
			'狩猟により得られた獣肉の解体施設 林業の実習棟で捕獲されたイノシシ、シカなどを解体し、精肉として処理する施設。解体の一連の流れを学べるように、通常の解体施設とは異なり開放的なつくりとなっている。 二本ある丸太の搬入された獣を吊るし、泥やダニ等を洗い流し、専用の架台を用いて建物内部に移動する。内部では、電動ウインチなども活用しながら効率的に切り分け、最終的に精肉まで処理する流れを作っている。 下見板張りで経年変化を楽しめる外観と、衛生のため洗い流しやすい室内仕上げとなっている。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_18: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_18.webp`,
		description:
			'2006年竣工の自力建設のシャワー室「桂の湯殿」の改修と、休憩室を兼ね備えた複合施設。 バイオマスボイラーを太陽熱給湯に置き換え、ボイラースペースに和室の休憩室を増床、劣化箇所の診断と修繕により機能回復を計った。 また、図書コーナーを併設した休憩室を隣接して建設した。こちらには焼杉をすのこ状に張った外壁が周囲の空間を引き締め、内部はリクライニングチェアを配した個室２ブースが設けられ、空調も含め快適に利用できる。',
		url: 'https://www.forest.ac.jp/facilities/self/'
	},
	ziriki_19: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_19.webp`,
		description:
			'森と人がつながる場所 テクニカルグラウンドは山と街との中間地点にあり、Cobikiはそこに建つ。 簡易製材機ホリゾンが設置され、丸太からの製材が容易にできる。 丸太の搬入がしやすいように広い開口になっており、複数人での作業も安全に行える。壁面には桟積みに使用する桟木や、帯鋸等が収納できる。ホリゾンのレールを跨ぐことを防止し、また仮の乾燥場としても使えるよう、レールカバーを製作した。 材料にはスギとヒノキを使用し、また仕上げを一部帯鋸仕上げとしたことで、樹種による経年変化の違い、仕上げによる経年変化の違いを見ることができる。',
		url: 'https://www.forest.ac.jp/facilities/self/midori-archi/'
	},
	ziriki_20: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_20.webp`,
		description:
			'「みどりのアトリエ」は、2008年度の自力建設「ほたるの川床（かわゆか）」を増改築するというものです。学生の複数の方から利活用の要望が出ていたものです。',
		url: 'https://www.forest.ac.jp/facilities/self/midori-archi/'
	},
	ziriki_21: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_21.webp`,
		description:
			'樹状架構が人と人をつなげる「みち」となる。ウッド・ラボ棟前面に広がるウッドデッキは、学生たちがグリーンウッドワーク（生木を使った木工製作）を行う場。そして、休憩や昼食を取る交流の場でもある。この空間に、庇・屋根付き通路から構成する「木立（こだち）のこみち」を建設した。アカデミーの雰囲気に適した形態として「樹状」で庇・通路のデザインを統一し、柱梁・方杖を細い部材としたことで、既存の校舎や植栽空間にも馴染む軽やかな架構となり、快適な軒下通路・休憩の場・木工製作の場が生まれた。',
		url: 'https://www.forest.ac.jp/facilities/self/jiriki-kodachi/'
	},
	ziriki_22: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_22.webp`,
		description: `今回の自力建設は、2007年度の自力建設「地空楼」を増改築し、木造建築倉庫を建築することでした。
            丁稚という言葉は、大工などの職人仕事で、門下に弟子入りした新入りなどのことをいいます。
            それは、立場は違えど新しく建築の世界に夢を持ち勉学や技術習得に励む私たちに近しいのではないかという思いと、コンセプトの秘密基地にかけて「丁稚基地」と名付けました。
            またここを利用するすべての人が、こだわりと愛着を持って、道具と倉庫本体を扱えるように、その拠点となれるという思いが込められています。`,
		url: 'https://www.forest.ac.jp/facilities/self/jiriki-decchi/'
	},
	ziriki_23: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_23.webp`,
		description: ``,
		url: 'https://www.forest.ac.jp/facilities/self/jiriki-hotori/'
	},
	ziriki_24: {
		image: `${FEATURE_IMAGE_BASE_PATH}/ziriki_24.webp`,
		description: `小規模木材乾燥庫の計画`,
		url: 'https://www.forest.ac.jp/facilities/self/shiori-jiriki2024/'
	},
	// other_point
	sinrinken: {
		// 岐阜県森林研究所
		image: `${FEATURE_IMAGE_BASE_PATH}/no_image.webp`,
		description: '森林・林業に関する公設研究機関です。',
		url: 'https://www.forest.rd.pref.gifu.lg.jp/'
	},
	gate_ensyurin: {
		image: `${FEATURE_IMAGE_BASE_PATH}/gate_ensyurin.webp`,
		description: '',
		url: null
	},
	aozyutaki: {
		image: `${FEATURE_IMAGE_BASE_PATH}/aozyutaki.webp`,
		description: '',
		url: null
	},
	azumaya_1: {
		image: `${FEATURE_IMAGE_BASE_PATH}/azumaya_1.webp`,
		description: '',
		url: null
	},
	azumaya_kezikabora: {
		image: `${FEATURE_IMAGE_BASE_PATH}/azumaya_kezikabora.webp`,
		description: '',
		url: null
	},
	gate_kokuyurin: {
		image: `${FEATURE_IMAGE_BASE_PATH}/gate_kokuyurin.webp`,
		description: '',
		url: null
	},
	hebiotaki: {
		image: `${FEATURE_IMAGE_BASE_PATH}/hebiotaki.webp`,
		description: '',
		url: null
	},
	heihuuiwa: {
		image: `${FEATURE_IMAGE_BASE_PATH}/heihuuiwa.webp`,
		description: '',
		url: null
	},
	hirumesiiwa: {
		image: `${FEATURE_IMAGE_BASE_PATH}/hirumesiiwa.webp`,
		description: '',
		url: null
	},
	kezikaboraike: {
		image: `${FEATURE_IMAGE_BASE_PATH}/kezikaboraike.webp`,
		description: '岐阜県美濃市内に所在する農業用ため池',
		url: null
	},
	miharasiiwa: {
		image: `${FEATURE_IMAGE_BASE_PATH}/miharasiiwa.webp`,
		description: '美濃市の街中を一望することができる岩場',
		url: null
	},
	mokudou: {
		image: `${FEATURE_IMAGE_BASE_PATH}/mokudou.webp`,
		description: '',
		url: null
	},
	morinoiriguti: {
		image: `${FEATURE_IMAGE_BASE_PATH}/morinoiriguti.webp`,
		description: '',
		url: 'https://morinos.net/what-is-morinos/'
	},
	nagamenoiwa: {
		// 眺めの岩
		image: `${FEATURE_IMAGE_BASE_PATH}/nagamenoiwa.webp`,
		description: '',
		url: null
	},
	oosugi: {
		// 大杉
		image: `${FEATURE_IMAGE_BASE_PATH}/oosugi.webp`,
		description: '樹齢約100年のヒノキ林に混在する大径のスギ。このスギにオオタカが毎年営巣する。',
		url: null
	},
	sumiyakigoya: {
		// 炭焼き小屋
		image: `${FEATURE_IMAGE_BASE_PATH}/sumiyakigoya.webp`,
		description: '',
		url: 'https://www.forest.ac.jp/academy-archives/%E5%8F%AA%E4%BB%8A%E3%80%81%E7%82%AD%E7%84%BC%E3%81%8D%E3%82%84%E3%81%A3%E3%81%A6%E3%81%BE%E3%81%99%EF%BC%81%E3%80%80%E3%82%A8%E3%83%B3%E3%82%B8%E3%83%8B%E3%82%A2%E7%A7%912%E5%B9%B4%E3%80%8C%E6%9C%A8/'
	},
	toilet: {
		image: `${FEATURE_IMAGE_BASE_PATH}/toilet.webp`,
		description: '',
		url: null
	},
	umanoseiwa: {
		image: `${FEATURE_IMAGE_BASE_PATH}/umanoseiwa.webp`,
		description: '',
		url: null
	},
	yamanokami: {
		// 山の神
		image: `${FEATURE_IMAGE_BASE_PATH}/yamanokami.webp`,
		description:
			'演習林内には、「山の神」と呼ばれる神聖な場所が存在します。この「山の神」は、巨大な磐座（いわくら）の直下に祀られており、周囲には樹齢100年を超えるスギやヒノキの人工林が広がっています。毎年4月、アカデミーでは「入山式」と称する伝統行事が行われます。この式典では、学長をはじめ教職員や学生、隣接する森林研究所の職員が参加し、「山の神」に対して実習や研修の安全を祈願します。式典では、祝詞の奏上や御玉串の奉納が行われ、最後にはお供え物を参加者全員でいただく「直会（なおらい）」が執り行われます。',
		url: 'https://www.forest.ac.jp/academy-archives/jimu0423/'
	},
	kozyo_kanritou: {
		image: null,
		description: '',
		url: 'https://mori-gakko.net/gifu/'
	}
};
