import type { Region } from '$routes/map/data/types/location';
import {
	WEB_MERCATOR_WORLD_BBOX,
	WEB_MERCATOR_JAPAN_BOUNDS,
	HOKKAIDO_BBOX,
	AOMORI_BBOX,
	IWATE_BBOX,
	MIYAGI_BBOX,
	AKITA_BBOX,
	YAMAGATA_BBOX,
	FUKUSHIMA_BBOX,
	IBARAKI_BBOX,
	TOCHIGI_BBOX,
	GUNMA_BBOX,
	SAITAMA_BBOX,
	CHIBA_BBOX,
	TOKYO_BBOX,
	KANAGAWA_BBOX,
	NIIGATA_BBOX,
	TOYAMA_BBOX,
	ISHIKAWA_BBOX,
	FUKUI_BBOX,
	YAMANASHI_BBOX,
	NAGANO_BBOX,
	GIFU_BBOX,
	SHIZUOKA_BBOX,
	AICHI_BBOX,
	MIE_BBOX,
	SHIGA_BBOX,
	KYOTO_BBOX,
	OSAKA_BBOX,
	HYOGO_BBOX,
	NARA_BBOX,
	WAKAYAMA_BBOX,
	TOTTORI_BBOX,
	SHIMANE_BBOX,
	OKAYAMA_BBOX,
	HIROSHIMA_BBOX,
	YAMAGUCHI_BBOX,
	TOKUSHIMA_BBOX,
	KAGAWA_BBOX,
	EHIME_BBOX,
	KOCHI_BBOX,
	FUKUOKA_BBOX,
	SAGA_BBOX,
	NAGASAKI_BBOX,
	KUMAMOTO_BBOX,
	OITA_BBOX,
	MIYAZAKI_BBOX,
	KAGOSHIMA_BBOX,
	OKINAWA_BBOX,
	NIIGATA_NAGAOKA_BBOX
} from './_bounds';

export type Bounds = [number, number, number, number];

/**
 * 地域名からBBOXを取得するためのマップ
 * キーはRegion型と対応
 */
export const BOUNDS_MAP: Record<string, Bounds> = {
	// 世界・全国
	世界: WEB_MERCATOR_WORLD_BBOX,
	全国: WEB_MERCATOR_JAPAN_BOUNDS,

	// 北海道
	北海道: HOKKAIDO_BBOX,

	// 東北
	青森県: AOMORI_BBOX,
	岩手県: IWATE_BBOX,
	宮城県: MIYAGI_BBOX,
	秋田県: AKITA_BBOX,
	山形県: YAMAGATA_BBOX,
	福島県: FUKUSHIMA_BBOX,

	// 関東
	茨城県: IBARAKI_BBOX,
	栃木県: TOCHIGI_BBOX,
	群馬県: GUNMA_BBOX,
	埼玉県: SAITAMA_BBOX,
	千葉県: CHIBA_BBOX,
	東京都: TOKYO_BBOX,
	神奈川県: KANAGAWA_BBOX,

	// 中部
	新潟県: NIIGATA_BBOX,
	富山県: TOYAMA_BBOX,
	石川県: ISHIKAWA_BBOX,
	福井県: FUKUI_BBOX,
	山梨県: YAMANASHI_BBOX,
	長野県: NAGANO_BBOX,
	岐阜県: GIFU_BBOX,
	静岡県: SHIZUOKA_BBOX,
	愛知県: AICHI_BBOX,

	// 近畿
	三重県: MIE_BBOX,
	滋賀県: SHIGA_BBOX,
	京都府: KYOTO_BBOX,
	大阪府: OSAKA_BBOX,
	兵庫県: HYOGO_BBOX,
	奈良県: NARA_BBOX,
	和歌山県: WAKAYAMA_BBOX,

	// 中国
	鳥取県: TOTTORI_BBOX,
	島根県: SHIMANE_BBOX,
	岡山県: OKAYAMA_BBOX,
	広島県: HIROSHIMA_BBOX,
	山口県: YAMAGUCHI_BBOX,

	// 四国
	徳島県: TOKUSHIMA_BBOX,
	香川県: KAGAWA_BBOX,
	愛媛県: EHIME_BBOX,
	高知県: KOCHI_BBOX,

	// 九州
	福岡県: FUKUOKA_BBOX,
	佐賀県: SAGA_BBOX,
	長崎県: NAGASAKI_BBOX,
	熊本県: KUMAMOTO_BBOX,
	大分県: OITA_BBOX,
	宮崎県: MIYAZAKI_BBOX,
	鹿児島県: KAGOSHIMA_BBOX,

	// 沖縄
	沖縄県: OKINAWA_BBOX,

	// その他
	新潟県長岡市: NIIGATA_NAGAOKA_BBOX,
	岐阜県美濃市: GIFU_BBOX // 美濃市は岐阜県のboundsを使用
} as const;

/**
 * BoundsKeyまたはBounds配列からBoundsを解決する
 */
export function resolveBounds(input: Region | Bounds): Bounds {
	if (Array.isArray(input)) {
		return input;
	}
	const bounds = BOUNDS_MAP[input];
	if (!bounds) {
		console.warn(`Unknown bounds key: ${input}, using Japan bounds`);
		return WEB_MERCATOR_JAPAN_BOUNDS;
	}
	return bounds;
}
