import { http, HttpResponse } from 'msw';

export const gsiHandlers = [
	http.get(
		'https://mreversegeocoder.gsi.go.jp/general/dem/scripts/getelevation.php',
		() =>
			HttpResponse.json({
				elevation: 123.45,
				hsrc: '5m'
			})
	),
	http.get(
		'https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress',
		() =>
			HttpResponse.json({
				results: {
					muniCd: '13104',
					lv01Nm: '西新宿'
				}
			})
	),
	http.get(
		'https://cyberjapandata.gsi.go.jp/xyz/cocotile/:z/:x/:y.csv',
		() => new HttpResponse('std,pale,relief')
	)
];
