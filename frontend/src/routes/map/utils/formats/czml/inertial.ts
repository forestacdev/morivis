import { JulianDate, TimeInterval, TimeStandard, Transforms } from '@cesium/engine';

// @cesium/engine 26.3 のIAU2006 XYS表の範囲（TT）。計算はCesiumへ委ねる。
const firstSample = new JulianDate(2442396.5, -32.184, TimeStandard.TAI);
const afterLastSample = JulianDate.addDays(firstSample, 27426, new JulianDate());

export const preloadCzmlInertial = async (times: JulianDate[]): Promise<void> => {
	// velocityReferenceが評価する前後の位置にも変換表を用意する。
	const start = JulianDate.addSeconds(times[0], -1, new JulianDate());
	const stop = JulianDate.addSeconds(times[times.length - 1], 1, new JulianDate());
	if (JulianDate.lessThan(start, firstSample) || !JulianDate.lessThan(stop, afterLastSample)) {
		throw new Error(
			'INERTIAL座標の時刻が変換データの対応期間外です（1974年12月中旬〜2050年1月中旬）'
		);
	}
	try {
		await Transforms.preloadIcrfFixed(new TimeInterval({ start, stop }));
		// Cesiumは取得失敗を握りつぶし、評価時にTEMEの近似へフォールバックする。
		// ICRFとして変換できることを先に確認し、別の座標系で登録しない。
		for (const time of [start, ...times, stop]) {
			if (!Transforms.computeIcrfToFixedMatrix(time)) throw new Error('Missing XYS data');
		}
	} catch {
		throw new Error(
			'INERTIAL座標の変換データを読み込めませんでした。通信状態を確認して再度登録してください'
		);
	}
};
