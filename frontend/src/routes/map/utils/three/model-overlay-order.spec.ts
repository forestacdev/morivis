import { describe, expect, it } from 'vitest';
import { getModelOverlayBeforeId, MODEL_OVERLAY_METADATA_KEY } from './model-overlay-order';

describe('3Dモデルと配置ガイドの描画順', () => {
	it('モデルを最初のガイドより前に置き、ポリゴンとラベルを手前に保つ', () => {
		expect(getModelOverlayBeforeId([
			{ id: 'test-base' },
			{ id: 'test-grid', metadata: { [MODEL_OVERLAY_METADATA_KEY]: true } },
			{ id: 'test-label', metadata: { [MODEL_OVERLAY_METADATA_KEY]: true } }
		])).toBe('test-grid');
	});
	it('配置ガイドがなければ従来の末尾追加を維持する', () => {
		expect(
			getModelOverlayBeforeId([{ id: 'test-base' }, {
				id: 'test-other',
				metadata: { [MODEL_OVERLAY_METADATA_KEY]: false }
			}])
		).toBeUndefined();
	});
});
