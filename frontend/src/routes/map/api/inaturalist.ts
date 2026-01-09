/**
 * iNaturalist API クライアント
 *
 * iNaturalist（アイナチュラリスト）は、世界中の市民科学者が
 * 野生生物の観察記録を投稿・共有するプラットフォームです。
 *
 * API公式ドキュメント: https://api.inaturalist.org/v1/docs/
 *
 * 利用制限:
 * - 最大100リクエスト/分（60以下を推奨）
 * - 認証なしでも多くのエンドポイントが利用可能
 */

// ============================================================
// 型定義
// ============================================================

/**
 * 分類群（Taxa）の型定義
 * 生物の分類情報を表す（種、属、科など）
 */
export interface INatTaxon {
	/** 分類群の一意なID */
	id: number;
	/** 学名（ラテン語表記、例: "Zosterops japonicus"） */
	name: string;
	/** 一般名/和名（例: "メジロ"） */
	preferred_common_name?: string;
	/** 分類階級（species=種, genus=属, family=科, order=目, class=綱, phylum=門, kingdom=界） */
	rank: string;
	/**
	 * 代表的な分類群名（アイコン用）
	 * Aves=鳥類, Mammalia=哺乳類, Reptilia=爬虫類, Amphibia=両生類,
	 * Actinopterygii=魚類, Insecta=昆虫, Arachnida=クモ類,
	 * Mollusca=軟体動物, Plantae=植物, Fungi=菌類
	 */
	iconic_taxon_name?: string;
	/** 観察数（この分類群がどれだけ観察されているか） */
	observations_count?: number;
	/** デフォルト写真 */
	default_photo?: {
		/** 中サイズ画像URL（約500px） */
		medium_url: string;
		/** 小サイズ画像URL（約75px） */
		square_url: string;
		/** 帰属表示（撮影者情報） */
		attribution: string;
		/** ライセンス（例: "cc-by-nc"） */
		license_code?: string;
	};
	/** 祖先の分類群（上位の分類） */
	ancestors?: INatTaxon[];
	/** Wikipedia概要（ロケールに応じた言語） */
	wikipedia_summary?: string;
	/** WikipediaのURL */
	wikipedia_url?: string;
}

/**
 * 観察記録（Observation）の型定義
 * ユーザーが投稿した生物の目撃記録
 */
export interface INatObservation {
	/** 観察記録の一意なID */
	id: number;
	/** 観察された種の推測名（ユーザー入力） */
	species_guess?: string;
	/** 観察日（YYYY-MM-DD形式） */
	observed_on?: string;
	/** 観察日時（ISO 8601形式） */
	observed_on_string?: string;
	/**
	 * 品質グレード
	 * - casual: カジュアル（位置情報や日付が不完全）
	 * - needs_id: 同定が必要（コミュニティの確認待ち）
	 * - research: 研究グレード（コミュニティに確認済み）
	 */
	quality_grade: 'casual' | 'needs_id' | 'research';
	/** 位置情報（GeoJSON形式） */
	geojson?: {
		type: 'Point';
		/** 座標 [経度, 緯度] */
		coordinates: [number, number];
	};
	/** 場所の説明（ユーザー入力） */
	place_guess?: string;
	/** 同定された分類群 */
	taxon?: INatTaxon;
	/** 投稿者情報 */
	user?: {
		id: number;
		login: string;
		name?: string;
		icon_url?: string;
	};
	/** 写真一覧 */
	photos?: Array<{
		id: number;
		url: string;
		attribution: string;
		license_code?: string;
	}>;
	/** 同定の数 */
	identifications_count?: number;
	/** コメントの数 */
	comments_count?: number;
	/** お気に入り数 */
	faves_count?: number;
}

/**
 * 場所（Place）の型定義
 * 地理的な場所の定義（国、都道府県、保護区など）
 */
export interface INatPlace {
	/** 場所の一意なID */
	id: number;
	/** 場所の名前 */
	name: string;
	/** 表示名（完全な名前） */
	display_name?: string;
	/**
	 * 行政レベル
	 * 0=国, 1=州/都道府県, 2=郡/市区町村, など
	 * null=行政区画ではない（保護区など）
	 */
	admin_level?: number | null;
	/** 境界ボックス [西経, 南緯, 東経, 北緯] */
	bounding_box_geojson?: {
		type: 'Polygon';
		coordinates: number[][][];
	};
	/** 祖先の場所ID（上位の行政区画） */
	ancestor_place_ids?: number[];
}

/**
 * 検索結果の共通型
 */
interface INatSearchResponse<T> {
	/** 総件数 */
	total_results: number;
	/** 現在のページ */
	page: number;
	/** 1ページあたりの件数 */
	per_page: number;
	/** 結果の配列 */
	results: T[];
}

// ============================================================
// 分類群（Taxa）関連の関数
// ============================================================

/**
 * 分類群を名前で検索（オートコンプリート用）
 *
 * 名前の先頭一致で分類群を検索します。
 * 検索窓のサジェスト機能などに最適です。
 *
 * @param query - 検索する名前（和名または学名）
 * @param options - オプション設定
 * @returns 一致する分類群の配列
 *
 * @example
 * // 「メジロ」で検索
 * const results = await searchTaxa('メジロ');
 * console.log(results[0].name); // "Zosterops japonicus"
 * console.log(results[0].preferred_common_name); // "メジロ"
 */
export const searchTaxa = async (
	query: string,
	options?: {
		/** 結果の件数（デフォルト: 10、最大: 30） */
		limit?: number;
		/** 分類階級でフィルタ（例: 'species'で種のみ） */
		rank?: 'kingdom' | 'phylum' | 'class' | 'order' | 'family' | 'genus' | 'species';
		/** 特定の分類群の子孫のみ検索（例: 鳥類=3） */
		taxonId?: number;
	}
): Promise<INatTaxon[]> => {
	const params = new URLSearchParams({
		q: query,
		locale: 'ja', // 日本語の一般名を優先
		per_page: (options?.limit || 10).toString()
	});

	if (options?.rank) {
		params.append('rank', options.rank);
	}
	if (options?.taxonId) {
		params.append('taxon_id', options.taxonId.toString());
	}

	try {
		const response = await fetch(`https://api.inaturalist.org/v1/taxa/autocomplete?${params}`);
		const data: INatSearchResponse<INatTaxon> = await response.json();
		return data.results || [];
	} catch (error) {
		console.error('iNaturalist Taxa Search Error:', error);
		return [];
	}
};

/**
 * 分類群の詳細情報を取得
 *
 * IDを指定して分類群の詳細（Wikipedia概要、祖先の分類など）を取得します。
 *
 * @param id - 分類群のID
 * @returns 分類群の詳細情報（見つからない場合はnull）
 *
 * @example
 * // メジロ（ID: 12704）の詳細を取得
 * const taxon = await getTaxonById(12704);
 * console.log(taxon?.wikipedia_summary);
 */
export const getTaxonById = async (id: number): Promise<INatTaxon | null> => {
	try {
		const response = await fetch(`https://api.inaturalist.org/v1/taxa/${id}?locale=ja`);
		const data: INatSearchResponse<INatTaxon> = await response.json();
		return data.results?.[0] || null;
	} catch (error) {
		console.error('iNaturalist Taxa Get Error:', error);
		return null;
	}
};

// ============================================================
// 観察記録（Observations）関連の関数
// ============================================================

/**
 * 観察記録を検索
 *
 * 様々な条件で観察記録を検索できます。
 * 地図上に観察地点を表示する場合などに使用します。
 *
 * @param options - 検索条件
 * @returns 観察記録の配列
 *
 * @example
 * // 日本でのメジロの観察記録を取得
 * const observations = await searchObservations({
 *   taxonId: 12704,      // メジロ
 *   placeId: 6737,       // 日本
 *   qualityGrade: 'research',
 *   limit: 50
 * });
 *
 * @example
 * // 特定の範囲内の観察記録を取得
 * const observations = await searchObservations({
 *   bounds: [139.5, 35.5, 140.0, 36.0], // [西経, 南緯, 東経, 北緯]
 *   hasPhotos: true,
 *   limit: 100
 * });
 */
export const searchObservations = async (options?: {
	/** 分類群ID（この分類群とその子孫の観察） */
	taxonId?: number;
	/** 場所ID（日本=6737、東京都=6367など） */
	placeId?: number;
	/** 境界ボックス [西経, 南緯, 東経, 北緯] */
	bounds?: [number, number, number, number];
	/** 品質グレードでフィルタ */
	qualityGrade?: 'casual' | 'needs_id' | 'research';
	/** 写真がある観察のみ */
	hasPhotos?: boolean;
	/** 位置情報がある観察のみ */
	hasGeo?: boolean;
	/** 観察日の開始日（YYYY-MM-DD） */
	dateFrom?: string;
	/** 観察日の終了日（YYYY-MM-DD） */
	dateTo?: string;
	/** ユーザーID */
	userId?: number;
	/** 取得件数（デフォルト: 20、最大: 200） */
	limit?: number;
	/** 並び順（created_at=投稿日, observed_on=観察日） */
	orderBy?: 'created_at' | 'observed_on' | 'species_guess' | 'votes';
	/** 昇順/降順 */
	order?: 'asc' | 'desc';
}): Promise<INatObservation[]> => {
	const params = new URLSearchParams({
		per_page: (options?.limit || 20).toString(),
		order: options?.order || 'desc',
		order_by: options?.orderBy || 'created_at',
		locale: 'ja'
	});

	if (options?.taxonId) {
		params.append('taxon_id', options.taxonId.toString());
	}
	if (options?.placeId) {
		params.append('place_id', options.placeId.toString());
	}
	if (options?.bounds) {
		params.append('swlng', options.bounds[0].toString());
		params.append('swlat', options.bounds[1].toString());
		params.append('nelng', options.bounds[2].toString());
		params.append('nelat', options.bounds[3].toString());
	}
	if (options?.qualityGrade) {
		params.append('quality_grade', options.qualityGrade);
	}
	if (options?.hasPhotos) {
		params.append('photos', 'true');
	}
	if (options?.hasGeo !== false) {
		// デフォルトで位置情報ありのみ
		params.append('geo', 'true');
	}
	if (options?.dateFrom) {
		params.append('d1', options.dateFrom);
	}
	if (options?.dateTo) {
		params.append('d2', options.dateTo);
	}
	if (options?.userId) {
		params.append('user_id', options.userId.toString());
	}

	try {
		const response = await fetch(`https://api.inaturalist.org/v1/observations?${params}`);
		const data: INatSearchResponse<INatObservation> = await response.json();
		return data.results || [];
	} catch (error) {
		console.error('iNaturalist Observations Search Error:', error);
		return [];
	}
};

/**
 * 観察記録の詳細を取得
 *
 * @param id - 観察記録のID
 * @returns 観察記録の詳細（見つからない場合はnull）
 */
export const getObservationById = async (id: number): Promise<INatObservation | null> => {
	try {
		const response = await fetch(`https://api.inaturalist.org/v1/observations/${id}?locale=ja`);
		const data: INatSearchResponse<INatObservation> = await response.json();
		return data.results?.[0] || null;
	} catch (error) {
		console.error('iNaturalist Observation Get Error:', error);
		return null;
	}
};

/**
 * 観察記録をGeoJSON形式で取得
 *
 * 地図にマーカーを表示する場合に便利です。
 *
 * @param options - searchObservationsと同じオプション
 * @returns GeoJSON FeatureCollection
 */
export const getObservationsAsGeoJSON = async (
	options?: Parameters<typeof searchObservations>[0]
): Promise<GeoJSON.FeatureCollection> => {
	const observations = await searchObservations(options);

	return {
		type: 'FeatureCollection',
		features: observations
			.filter((obs) => obs.geojson)
			.map((obs) => ({
				type: 'Feature' as const,
				geometry: obs.geojson!,
				properties: {
					id: obs.id,
					species_guess: obs.species_guess,
					observed_on: obs.observed_on,
					quality_grade: obs.quality_grade,
					place_guess: obs.place_guess,
					taxon_name: obs.taxon?.name,
					taxon_common_name: obs.taxon?.preferred_common_name,
					photo_url: obs.photos?.[0]?.url,
					user_login: obs.user?.login
				}
			}))
	};
};

// ============================================================
// 場所（Places）関連の関数
// ============================================================

/**
 * 場所を名前で検索
 *
 * @param query - 検索する場所名
 * @param options - オプション設定
 * @returns 一致する場所の配列
 *
 * @example
 * // 「東京」で検索
 * const places = await searchPlaces('Tokyo');
 * // places[0].id を使って観察記録を絞り込める
 */
export const searchPlaces = async (
	query: string,
	options?: {
		/** 結果の件数（デフォルト: 10） */
		limit?: number;
		/** 行政レベルでフィルタ（0=国, 1=州/都道府県） */
		adminLevel?: number;
	}
): Promise<INatPlace[]> => {
	const params = new URLSearchParams({
		q: query,
		per_page: (options?.limit || 10).toString()
	});

	if (options?.adminLevel !== undefined) {
		params.append('admin_level', options.adminLevel.toString());
	}

	try {
		const response = await fetch(`https://api.inaturalist.org/v1/places/autocomplete?${params}`);
		const data: INatSearchResponse<INatPlace> = await response.json();
		return data.results || [];
	} catch (error) {
		console.error('iNaturalist Places Search Error:', error);
		return [];
	}
};

/**
 * 近くの場所を検索
 *
 * 指定した境界ボックス内の場所を取得します。
 *
 * @param bounds - 境界ボックス [西経, 南緯, 東経, 北緯]
 * @returns 場所の配列
 */
export const getNearbyPlaces = async (
	bounds: [number, number, number, number]
): Promise<INatPlace[]> => {
	const params = new URLSearchParams({
		swlng: bounds[0].toString(),
		swlat: bounds[1].toString(),
		nelng: bounds[2].toString(),
		nelat: bounds[3].toString()
	});

	try {
		const response = await fetch(`https://api.inaturalist.org/v1/places/nearby?${params}`);
		const data = await response.json();
		// nearbyは standard と community の2種類を返す
		return [...(data.results?.standard || []), ...(data.results?.community || [])];
	} catch (error) {
		console.error('iNaturalist Places Nearby Error:', error);
		return [];
	}
};

// ============================================================
// 便利な定数
// ============================================================

/**
 * よく使う場所ID
 */
export const PLACE_IDS = {
	/** 日本 */
	JAPAN: 6737,
	/** 東京都 */
	TOKYO: 6367,
	/** 北海道 */
	HOKKAIDO: 6338,
	/** 沖縄県 */
	OKINAWA: 6402
} as const;

/**
 * よく使う分類群ID（代表的な生物群）
 */
export const TAXON_IDS = {
	/** 鳥類（Aves） */
	BIRDS: 3,
	/** 哺乳類（Mammalia） */
	MAMMALS: 40151,
	/** 爬虫類（Reptilia） */
	REPTILES: 26036,
	/** 両生類（Amphibia） */
	AMPHIBIANS: 20978,
	/** 魚類（Actinopterygii） */
	FISH: 47178,
	/** 昆虫（Insecta） */
	INSECTS: 47158,
	/** クモ類（Arachnida） */
	ARACHNIDS: 47119,
	/** 軟体動物（Mollusca） */
	MOLLUSKS: 47115,
	/** 植物（Plantae） */
	PLANTS: 47126,
	/** 菌類（Fungi） */
	FUNGI: 47170
} as const;

// ============================================================
// 画像取得関連の関数
// ============================================================

/**
 * 画像サイズの種類
 * - square: 75x75px（サムネイル、正方形にクロップ）
 * - small: 最大240px
 * - medium: 最大500px
 * - large: 最大1024px
 * - original: オリジナルサイズ（高解像度だが重い）
 */
export type INatImageSize = 'square' | 'small' | 'medium' | 'large' | 'original';

/**
 * 画像URLを指定サイズに変換
 * @param url - 元の画像URL
 * @param size - 希望のサイズ
 * @returns 変換後のURL
 */
const convertImageUrl = (url: string, size: INatImageSize): string => {
	// iNaturalistの画像URLは /photos/xxxxx/square.jpg のような形式
	// square, small, medium, large, original を置換する
	return url.replace(/\/(square|small|medium|large|original)\./, `/${size}.`);
};

/**
 * 生物の画像情報
 */
export interface INatImage {
	/** 画像URL（指定サイズ） */
	url: string;
	/** 小サイズ画像URL（75x75px、サムネイル用） */
	squareUrl: string;
	/** 中サイズ画像URL（最大500px） */
	mediumUrl: string;
	/** 大サイズ画像URL（最大1024px） */
	largeUrl: string;
	/** オリジナルサイズ画像URL */
	originalUrl: string;
	/** 帰属表示（撮影者情報） */
	attribution: string;
	/** ライセンスコード（例: "cc-by-nc"） */
	licenseCode?: string;
	/** 分類群ID */
	taxonId: number;
	/** 学名 */
	scientificName: string;
	/** 和名/一般名 */
	commonName?: string;
	/** 観察数 */
	observationsCount?: number;
}

/**
 * 画像URLから全サイズのURLを生成
 */
const createImageUrls = (
	baseUrl: string,
	size: INatImageSize
): { url: string; squareUrl: string; mediumUrl: string; largeUrl: string; originalUrl: string } => {
	return {
		url: convertImageUrl(baseUrl, size),
		squareUrl: convertImageUrl(baseUrl, 'square'),
		mediumUrl: convertImageUrl(baseUrl, 'medium'),
		largeUrl: convertImageUrl(baseUrl, 'large'),
		originalUrl: convertImageUrl(baseUrl, 'original')
	};
};

/**
 * 生物名から画像を取得（日本での観察優先）
 *
 * 和名または学名で検索し、代表的な画像を取得します。
 * まず分類群のデフォルト写真を探し、なければ日本での観察記録から取得します。
 *
 * @param name - 生物の名前（和名または学名、例: "メジロ", "Zosterops japonicus"）
 * @param options - オプション設定
 * @returns 画像情報（見つからない場合はnull）
 *
 * @example
 * // 和名で検索（デフォルトはmediumサイズ）
 * const image = await getImageByName('メジロ');
 * if (image) {
 *   console.log('画像URL:', image.url);        // mediumサイズ
 *   console.log('大きい画像:', image.largeUrl); // largeサイズ
 *   console.log('撮影者:', image.attribution);
 * }
 *
 * @example
 * // 大きい画像を取得
 * const image = await getImageByName('メジロ', { size: 'large' });
 * console.log(image?.url); // largeサイズのURL
 *
 * @example
 * // 学名で検索
 * const image = await getImageByName('Parus minor');
 * console.log(image?.commonName); // "シジュウカラ"
 */
export const getImageByName = async (
	name: string,
	options?: {
		/** 画像サイズ（デフォルト: 'medium'） */
		size?: INatImageSize;
		/** 日本での観察に限定するか（デフォルト: true） */
		japanOnly?: boolean;
		/** 研究グレードの観察のみ使用するか（デフォルト: false） */
		researchGradeOnly?: boolean;
	}
): Promise<INatImage | null> => {
	const size = options?.size || 'medium';

	try {
		// 1. まず分類群を検索
		const taxa = await searchTaxa(name, { limit: 1 });

		if (taxa.length === 0) {
			return null;
		}

		const taxon = taxa[0];

		// 2. 分類群にデフォルト写真があればそれを使用
		if (taxon.default_photo?.medium_url) {
			const urls = createImageUrls(taxon.default_photo.medium_url, size);
			return {
				...urls,
				attribution: taxon.default_photo.attribution,
				licenseCode: taxon.default_photo.license_code,
				taxonId: taxon.id,
				scientificName: taxon.name,
				commonName: taxon.preferred_common_name,
				observationsCount: taxon.observations_count
			};
		}

		// 3. デフォルト写真がなければ、観察記録から取得
		const japanOnly = options?.japanOnly !== false; // デフォルトtrue
		const observations = await searchObservations({
			taxonId: taxon.id,
			placeId: japanOnly ? PLACE_IDS.JAPAN : undefined,
			qualityGrade: options?.researchGradeOnly ? 'research' : undefined,
			hasPhotos: true,
			limit: 1
		});

		if (observations.length > 0 && observations[0].photos?.[0]) {
			const photo = observations[0].photos[0];
			const urls = createImageUrls(photo.url, size);
			return {
				...urls,
				attribution: photo.attribution,
				licenseCode: photo.license_code,
				taxonId: taxon.id,
				scientificName: taxon.name,
				commonName: taxon.preferred_common_name,
				observationsCount: taxon.observations_count
			};
		}

		return null;
	} catch (error) {
		console.error('iNaturalist getImageByName Error:', error);
		return null;
	}
};

/**
 * 生物名から複数の画像を取得（日本での観察）
 *
 * 複数の異なる観察記録から画像を取得します。
 * ギャラリー表示などに使用できます。
 *
 * @param name - 生物の名前（和名または学名）
 * @param options - オプション設定
 * @returns 画像情報の配列
 *
 * @example
 * // メジロの画像を5枚取得
 * const images = await getImagesByName('メジロ', { limit: 5 });
 * images.forEach(img => {
 *   console.log(img.url, img.attribution);
 * });
 *
 * @example
 * // 大きいサイズで取得
 * const images = await getImagesByName('メジロ', { limit: 5, size: 'large' });
 */
export const getImagesByName = async (
	name: string,
	options?: {
		/** 取得する画像の数（デフォルト: 5、最大: 20） */
		limit?: number;
		/** 画像サイズ（デフォルト: 'medium'） */
		size?: INatImageSize;
		/** 日本での観察に限定するか（デフォルト: true） */
		japanOnly?: boolean;
		/** 研究グレードの観察のみ使用するか（デフォルト: false） */
		researchGradeOnly?: boolean;
	}
): Promise<INatImage[]> => {
	const size = options?.size || 'medium';

	try {
		// 1. まず分類群を検索
		const taxa = await searchTaxa(name, { limit: 1 });

		if (taxa.length === 0) {
			return [];
		}

		const taxon = taxa[0];
		const limit = Math.min(options?.limit || 5, 20);
		const japanOnly = options?.japanOnly !== false;

		// 2. 観察記録から画像を取得
		const observations = await searchObservations({
			taxonId: taxon.id,
			placeId: japanOnly ? PLACE_IDS.JAPAN : undefined,
			qualityGrade: options?.researchGradeOnly ? 'research' : undefined,
			hasPhotos: true,
			limit: limit
		});

		return observations
			.filter((obs) => obs.photos && obs.photos.length > 0)
			.map((obs) => {
				const photo = obs.photos![0];
				const urls = createImageUrls(photo.url, size);
				return {
					...urls,
					attribution: photo.attribution,
					licenseCode: photo.license_code,
					taxonId: taxon.id,
					scientificName: taxon.name,
					commonName: taxon.preferred_common_name,
					observationsCount: taxon.observations_count
				};
			});
	} catch (error) {
		console.error('iNaturalist getImagesByName Error:', error);
		return [];
	}
};

/**
 * 分類群IDから画像を取得
 *
 * IDが既知の場合に高速に画像を取得できます。
 *
 * @param taxonId - 分類群のID
 * @param options - オプション設定
 * @returns 画像情報（見つからない場合はnull）
 *
 * @example
 * // メジロ（ID: 12704）の画像を取得
 * const image = await getImageByTaxonId(12704);
 *
 * @example
 * // 大きいサイズで取得
 * const image = await getImageByTaxonId(12704, { size: 'large' });
 */
export const getImageByTaxonId = async (
	taxonId: number,
	options?: {
		/** 画像サイズ（デフォルト: 'medium'） */
		size?: INatImageSize;
		/** 日本での観察に限定するか（デフォルト: true） */
		japanOnly?: boolean;
	}
): Promise<INatImage | null> => {
	const size = options?.size || 'medium';

	try {
		// 分類群の詳細を取得
		const taxon = await getTaxonById(taxonId);

		if (!taxon) {
			return null;
		}

		// デフォルト写真があればそれを使用
		if (taxon.default_photo?.medium_url) {
			const urls = createImageUrls(taxon.default_photo.medium_url, size);
			return {
				...urls,
				attribution: taxon.default_photo.attribution,
				licenseCode: taxon.default_photo.license_code,
				taxonId: taxon.id,
				scientificName: taxon.name,
				commonName: taxon.preferred_common_name,
				observationsCount: taxon.observations_count
			};
		}

		// 観察記録から取得
		const japanOnly = options?.japanOnly !== false;
		const observations = await searchObservations({
			taxonId: taxon.id,
			placeId: japanOnly ? PLACE_IDS.JAPAN : undefined,
			hasPhotos: true,
			limit: 1
		});

		if (observations.length > 0 && observations[0].photos?.[0]) {
			const photo = observations[0].photos[0];
			const urls = createImageUrls(photo.url, size);
			return {
				...urls,
				attribution: photo.attribution,
				licenseCode: photo.license_code,
				taxonId: taxon.id,
				scientificName: taxon.name,
				commonName: taxon.preferred_common_name,
				observationsCount: taxon.observations_count
			};
		}

		return null;
	} catch (error) {
		console.error('iNaturalist getImageByTaxonId Error:', error);
		return null;
	}
};
