import { get, writable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$routes/stores/ui', () => ({ isProcessing: writable(false) }));

import { isProcessing } from '$routes/stores/ui';
import { beginUploadProcessing } from './processing-guard';

describe('upload processing guard', () => {
	it('完了時に解除し、その後のabortで次の処理を解除しない', () => {
		const first = new AbortController();
		const releaseFirst = beginUploadProcessing(first.signal);
		expect(get(isProcessing)).toBe(true);
		releaseFirst();
		expect(get(isProcessing)).toBe(false);
		const releaseNext = beginUploadProcessing(new AbortController().signal);
		first.abort();
		releaseFirst();
		expect(get(isProcessing)).toBe(true);
		releaseNext();
		expect(get(isProcessing)).toBe(false);
	});
	it('解析から登録へ処理が重なっても、最後の処理まで表示する', () => {
		const controller = new AbortController();
		const releaseParse = beginUploadProcessing(controller.signal);
		const releaseRegister = beginUploadProcessing(controller.signal);
		releaseParse();
		expect(get(isProcessing)).toBe(true);
		releaseRegister();
		expect(get(isProcessing)).toBe(false);
	});
	it('中断直後に解除し、遅れて届くfinallyが新しい処理に影響しない', () => {
		const old = new AbortController();
		const releaseOld = beginUploadProcessing(old.signal);
		old.abort();
		expect(get(isProcessing)).toBe(false);
		const releaseNew = beginUploadProcessing(new AbortController().signal);
		releaseOld();
		expect(get(isProcessing)).toBe(true);
		releaseNew();
	});
	it('開始前に中断された処理はガードを表示しない', () => {
		const controller = new AbortController();
		controller.abort();
		beginUploadProcessing(controller.signal)();
		expect(get(isProcessing)).toBe(false);
	});
});
