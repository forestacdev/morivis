// https://www.p2pquake.net/develop/json_api_v2/

// タイムスタンプ情報
interface Timestamp {
	convert: string;
	register: string;
}

// 基本的な共通フィールド
interface BaseEvent {
	id: string;
	time: string;
	code: number;
	cancelled?: boolean;
	timestamp?: Timestamp;
	user_agent?: string;
	ver?: string;
}

// 地震情報のイシュー情報
interface Issue {
	source: string;
	time: string;
	correct?: string;
	type?: string;
	eventId?: string;
	serial?: string;
}

// 震源情報
interface Hypocenter {
	depth: number; // -1 で不明
	latitude: number; // -200 で不明
	longitude: number; // -200 で不明
	magnitude: number; // -1 で不明
	name: string; // 空文字で不明
	reduceName?: string;
}

// 地震情報
interface Earthquake {
	domesticTsunami: string; // "None", "Checking", "Unknown"
	foreignTsunami: string; // "None", "Checking", "Unknown"
	hypocenter: Hypocenter;
	maxScale: number; // -1 で不明
	time: string;
	condition?: string;
	originTime?: string;
	arrivalTime?: string;
}

// 震度観測点情報
interface Point {
	addr: string;
	isArea: boolean;
	pref: string;
	scale: number;
}

// コメント情報
interface Comments {
	freeFormComment: string;
}

// 津波到達情報
interface FirstHeight {
	condition?: string;
	arrivalTime?: string;
}

// 津波高さ情報
interface MaxHeight {
	description: string;
	value: number;
}

// 津波エリア情報
interface TsunamiArea {
	grade: string;
	immediate: boolean;
	name: string;
	firstHeight?: FirstHeight;
	maxHeight?: MaxHeight;
}

// 緊急地震速報エリア情報
interface EEWArea {
	pref: string;
	name: string;
	scaleFrom: number;
	scaleTo: number;
	kindCode: string;
	arrivalTime: string | null;
}

// ピア情報
interface PeerArea {
	id: number;
	peer: number;
}

// 地震情報 (code: 551)
interface EarthquakeInformation extends BaseEvent {
	code: 551;
	issue: Issue;
	earthquake: Earthquake;
	points: Point[];
	comments: Comments;
}

// 津波情報 (code: 552)
interface TsunamiInformation extends BaseEvent {
	code: 552;
	issue: Issue;
	areas: TsunamiArea[];
}

// ピア情報 (code: 555)
interface PeerInformation extends BaseEvent {
	code: 555;
	areas: PeerArea[];
}

// 完全版情報 (code: 554)
interface FullInformation extends BaseEvent {
	code: 554;
	type: string;
}

// 緊急地震速報 (code: 556)
interface EEWInformation extends BaseEvent {
	code: 556;
	earthquake: Earthquake;
	issue: Issue;
	areas: EEWArea[];
}

// エリア情報 (code: 561)
interface AreaInformation extends BaseEvent {
	code: 561;
	area: number;
}

// 不明な情報形式
interface UnknownInformation extends BaseEvent {
	[key: string]: any;
}

// 全ての情報タイプのユニオン型
type EventInformation =
	| EarthquakeInformation
	| TsunamiInformation
	| PeerInformation
	| FullInformation
	| EEWInformation
	| AreaInformation
	| UnknownInformation;

// メインの配列型
type EventData = EventInformation[];

// 型ガード関数
export function isEarthquakeInformation(event: EventInformation): event is EarthquakeInformation {
	return event.code === 551;
}

export function isTsunamiInformation(event: EventInformation): event is TsunamiInformation {
	return event.code === 552;
}

export function isPeerInformation(event: EventInformation): event is PeerInformation {
	return event.code === 555;
}

export function isFullInformation(event: EventInformation): event is FullInformation {
	return event.code === 554;
}

export function isEEWInformation(event: EventInformation): event is EEWInformation {
	return event.code === 556;
}

export function isAreaInformation(event: EventInformation): event is AreaInformation {
	return event.code === 561;
}

export const getEarthquakeData = async (): Promise<EventData> => {
	try {
		const response = await fetch('https://api.p2pquake.net/v2/history?codes=551&limit=100');
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data: EventData = await response.json();
		// 座標がおかしいものは排除
		const filteredData = data.filter((event) => {
			if (isEarthquakeInformation(event)) {
				return event.earthquake.hypocenter.latitude !== -200 && event.points.length > 0;
			}
			return false;
		});
		return filteredData;
	} catch (error) {
		console.error('Error fetching earthquake data:', error);
		throw new Error('Failed to fetch earthquake data');
	}
};
