import { describe, expect, it } from 'vitest';

import { normalizeHttpUrlInput } from './request';

describe('normalizeHttpUrlInput', () => {
	it('s3 スキームの Source Cooperative URL を https に正規化できる', () => {
		expect(
			normalizeHttpUrlInput('s3://us-west-2.opendata.source.coop/tge-labs/aef-mosaic')
		).toBe('https://us-west-2.opendata.source.coop/tge-labs/aef-mosaic');
	});

	it('一般的な s3 bucket/key 形式も https URL に正規化できる', () => {
		expect(normalizeHttpUrlInput('s3://example-bucket/path/to/data.zarr')).toBe(
			'https://example-bucket.s3.amazonaws.com/path/to/data.zarr'
		);
	});
});
