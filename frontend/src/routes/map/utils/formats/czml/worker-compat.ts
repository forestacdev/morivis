// Cesiumのプロパティデコーダーはswitchの比較でDOMのImageコンストラクターを参照する。
// Workerでは画像をデコードしない。型比較に必要な識別子だけを補い、画像処理は許可しない。
if (typeof globalThis.Image === 'undefined') {
	Object.defineProperty(globalThis, 'Image', {
		configurable: true,
		value: class {
			constructor() {
				throw new Error('CZMLの解析Workerでは画像を読み込めません');
			}
		}
	});
}
