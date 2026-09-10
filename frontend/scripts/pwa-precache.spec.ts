import { describe, expect, it } from 'vitest';
import { getLazyPrecacheIgnores } from './pwa-precache';

describe('PWA precache', () => {
	it('起動時の静的依存を残し、遅延フォーム・デコーダー・Workerを除外する', () => {
		const chunk = (fileName: string, imports: string[] = [], isEntry = false) => ({
			type: 'chunk' as const,
			fileName,
			imports,
			isEntry
		});
		expect(getLazyPrecacheIgnores({
			'test-entry.js': chunk('test-entry.js', ['test-shared.js'], true),
			'test-shared.js': chunk('test-shared.js', ['test-nested.js']),
			'test-nested.js': chunk('test-nested.js', ['test-shared.js']),
			'test-form.js': chunk('test-form.js', ['test-shared.js', 'test-decoder.js']),
			'test-decoder.js': chunk('test-decoder.js'),
			'test-worker.js': { type: 'asset', fileName: 'test-worker.js' }
		})).toEqual(['client/test-form.js', 'client/test-decoder.js', 'client/test-worker.js']);
	});
});
