interface iNatTaxon {
	id: number;
	name: string; // 学名
	preferred_common_name: string; // 一般名
	rank: string;
	iconic_taxon_name: string;
	default_photo?: {
		medium_url: string;
		attribution: string;
	};
}

const searchiNaturalist = async (name: string): Promise<iNatTaxon[]> => {
	const params = new URLSearchParams({
		q: name,
		locale: 'ja',
		per_page: '10'
	});

	const response = await fetch(`https://api.inaturalist.org/v1/taxa/autocomplete?${params}`);

	const data = await response.json();
	return data.results || [];
};

// 観察記録も取得
const getObservations = async (taxonId: number, place?: string) => {
	const params = new URLSearchParams({
		taxon_id: taxonId.toString(),
		per_page: '20',
		order: 'desc',
		order_by: 'created_at'
	});

	if (place) {
		params.append('place_id', place); // 日本: 6737
	}

	const response = await fetch(`https://api.inaturalist.org/v1/observations?${params}`);

	const data = await response.json();
	return data.results || [];
};

// const get = async () => {
// 	// 使用例
// 	const taxa = await searchiNaturalist('メジロ');
// 	if (taxa.length > 0) {
// 		console.log('名前:', taxa[0].preferred_common_name);
// 		console.log('学名:', taxa[0].name);
// 		console.log('画像:', taxa[0].default_photo?.medium_url);

// 		// 日本での観察記録を取得
// 		const observations = await getObservations(taxa[0].id, '6737');
// 		console.log('日本での観察記録:', observations.length);
// 	}
// };

// get();

// iNaturalist APIから観察データを取得
interface Observation {
	id: number;
	geojson: {
		type: 'Point';
		coordinates: [number, number]; // [lng, lat]
	};
	species_guess: string;
	observed_on: string;
}

async function fetchObservations(options?: {
	taxonId?: number;
	bounds?: [number, number, number, number];
	limit?: number; // 取得件数（最大200）
}): Promise<Observation[]> {
	const params = new URLSearchParams({
		per_page: (options?.limit || 1).toString(),
		...(options?.taxonId && { taxon_id: options.taxonId.toString() }),
		...(options?.bounds && {
			nelat: options.bounds[3].toString(),
			nelng: options.bounds[2].toString(),
			swlat: options.bounds[1].toString(),
			swlng: options.bounds[0].toString()
		})
	});

	const response = await fetch(`https://api.inaturalist.org/v1/observations?${params}`);
	const data = await response.json();
	return data.results;
}
