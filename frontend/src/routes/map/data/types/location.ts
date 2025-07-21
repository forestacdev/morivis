// 地域ごとの都道府県型
type Hokkaido = '北海道';

type Tohoku = '青森県' | '岩手県' | '宮城県' | '秋田県' | '山形県' | '福島県';

type Kanto = '茨城県' | '栃木県' | '群馬県' | '埼玉県' | '千葉県' | '東京都' | '神奈川県';

type Chubu =
	| '新潟県'
	| '富山県'
	| '石川県'
	| '福井県'
	| '山梨県'
	| '長野県'
	| '岐阜県'
	| '静岡県'
	| '愛知県';

type Kinki = '三重県' | '滋賀県' | '京都府' | '大阪府' | '兵庫県' | '奈良県' | '和歌山県';

type Chugoku = '鳥取県' | '島根県' | '岡山県' | '広島県' | '山口県';

type Shikoku = '徳島県' | '香川県' | '愛媛県' | '高知県';

type Kyushu = '福岡県' | '佐賀県' | '長崎県' | '熊本県' | '大分県' | '宮崎県' | '鹿児島県';

type Okinawa = '沖縄県';

type LocationOther = '森林文化アカデミー' | '岐阜県美濃市' | 'その他';
// 全都道府県型
export type Region =
	| Hokkaido
	| Tohoku
	| Kanto
	| Chubu
	| Kinki
	| Chugoku
	| Shikoku
	| Kyushu
	| Okinawa
	| '全国'
	| '世界'
	| '不明'
	| LocationOther;
