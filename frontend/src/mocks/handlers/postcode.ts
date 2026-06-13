import { http, HttpResponse } from 'msw';

export const postcodeHandlers = [
	http.get(
		'https://postcode.teraren.com/postcodes/:postcode.json',
		({ params }) =>
			HttpResponse.json({
				jis: '13104',
				old: String(params.postcode),
				new: String(params.postcode),
				prefecture_kana: 'トウキョウト',
				city_kana: 'シンジュクク',
				suburb_kana: 'ニシシンジュク',
				prefecture: '東京都',
				city: '新宿区',
				suburb: '西新宿',
				location: {
					latitude: '35.6895',
					longitude: '139.6917'
				}
			})
	),
	http.get('https://postcode.teraren.com/postcodes/:postcode.txt', ({ request }) => {
		const url = new URL(request.url);
		const part = url.searchParams.get('part');
		const text = part === '1' ? '東京都' : '東京都新宿区西新宿';
		return new HttpResponse(text);
	}),
	http.get('https://postcode.teraren.com/postcodes.json', () =>
		HttpResponse.json([
			{
				jis: '13104',
				old: '1600023',
				new: '1600023',
				prefecture_kana: 'トウキョウト',
				city_kana: 'シンジュクク',
				suburb_kana: 'ニシシンジュク',
				prefecture: '東京都',
				city: '新宿区',
				suburb: '西新宿',
				location: {
					latitude: '35.6895',
					longitude: '139.6917'
				}
			}
		]))
];
