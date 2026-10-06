import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFixture = async (page: Page, name: string | string[], invalid = false) => {
	const files = (Array.isArray(name) ? name : [name]).map(name => ({
		name,
		bytes: [
			...readFileSync(
				new URL(
					`../src/routes/map/utils/formats/dwg/__fixtures__/${name}`,
					import.meta.url
				)
			)
		]
	}));
	const surface = page.locator('canvas.maplibregl-canvas:visible').first();
	// 解析が終わっても短時間残るProcessingの退場アニメーションを待つ。
	await expect.poll(() =>
		surface.evaluate(canvas => {
			const bounds = canvas.getBoundingClientRect();
			return !!document.elementFromPoint(
				bounds.left + bounds.width / 2,
				bounds.top + bounds.height / 2
			)?.closest('[role="region"]');
		})
	).toBe(true);
	await surface.evaluate((canvas, input) => {
		const transfer = new DataTransfer();
		for (const file of input.files) {
			transfer.items.add(
				new File(
					[input.invalid ? 'test-invalid-dwg' : new Uint8Array(file.bytes)],
					file.name
				)
			);
		}
		const bounds = canvas.getBoundingClientRect();
		const target = document.elementFromPoint(
			bounds.left + bounds.width / 2,
			bounds.top + bounds.height / 2
		) ?? canvas;
		target.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	}, { files, invalid });
};

const selectOnlyGeometry = async (page: Page, label: string) => {
	await expect(page.getByRole('checkbox', { name: label, exact: true })).toBeEnabled();
	for (const name of ['ポイント', 'ライン', 'ポリゴン']) {
		const checkbox = page.getByRole('checkbox', { name, exact: true });
		if (await checkbox.count()) await checkbox.setChecked(name === label);
	}
};

for (const mode of ['2d', '3d']) {
	test(`高さ付きDXFラインを${mode}で読み込み、指定した描画方式で登録する`, async ({ page }) => {
		await dropFixture(page, 'test-elevated-line.dxf');
		await expect(page.getByLabel('読み込み方式')).toHaveValue('2d');
		await expect(page.getByLabel('読み込み方式').locator('option[value="auto"]')).toHaveCount(
			0
		);
		if (mode === '3d') await page.getByLabel('読み込み方式').selectOption('3d');
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(
			page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
				hasText: 'test-elevated-line'
			})
		).toHaveCount(1);
		await expect(page.getByText(mode === '2d' ? 'ライン' : '3Dモデル', { exact: true }))
			.toHaveCount(1);
		await expect(page.getByText(mode === '2d' ? '3Dモデル' : 'ライン', { exact: true }))
			.toHaveCount(0);
	});
}

test.beforeEach(async ({ page }) => {
	await page.route('**/assets/street_view/*', async route => {
		if (new URL(route.request().url()).pathname.endsWith('.fgb')) {
			await route.fulfill({
				contentType: 'application/octet-stream',
				body: readFileSync(
					new URL(
						'../src/routes/map/utils/formats/video/__fixtures__/test-empty.fgb',
						import.meta.url
					)
				)
			});
		} else await route.fulfill({ contentType: 'application/json', body: '{}' });
	});
	await page.goto('map?c=2.500000_1.250000&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	await page.locator('canvas.maplibregl-canvas:visible').first().waitFor();
});

for (const extension of ['dwg', 'dxf']) {
	test(`${extension}の3D面をモデル配置から地図へ追加し、再ドロップできる`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		await dropFixture(page, `test-mesh.${extension}`);
		await expect(page.getByText(`${extension.toUpperCase()}ファイルの登録`, { exact: true }))
			.toBeVisible();
		await selectOnlyGeometry(page, 'ポリゴン');
		await expect(page.getByLabel('読み込み方式')).toHaveValue('3d');
		await expect(page.getByLabel('test-face', { exact: true })).toBeChecked();
		await page.getByLabel('図面の単位').selectOption('m');
		await expect(page.getByText('読み込む範囲（X × Y）：20 × 10 m', { exact: true }))
			.toBeVisible();
		await selectOnlyGeometry(page, 'ポリゴン');
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		await expect(
			page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true })
		).toBeAttached();
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText('test-mesh', { exact: true }).first()).toBeVisible();
		await dropFixture(page, `test-mesh.${extension}`);
		await expect(page.getByLabel('図面の単位')).toHaveValue('auto');
		await selectOnlyGeometry(page, 'ポリゴン');
		await page.getByLabel('読み込み方式').selectOption('2d-line');
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await expect(page.getByText('投影法選択', { exact: true }).first()).toBeVisible();
		expect(errors).toEqual([]);
	});
}

test('不正なDWGのエラー後にキャンセルして再読込できる', async ({ page }) => {
	await dropFixture(page, 'test-mesh.dwg', true);
	await expect(page.getByRole('button', { name: '決定', exact: true })).toBeDisabled();
	await expect(page.getByLabel('図面の単位')).toBeEnabled();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-mesh.dwg');
	await selectOnlyGeometry(page, 'ポリゴン');
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true })).toBeEnabled();
});

for (const encoding of ['sat', 'sab']) {
	test(`ACIS ${encoding}のソリッドを選択して地図へ登録する`, async ({ page }, testInfo) => {
		await dropFixture(page, `test-solids-${encoding}.dwg`);
		await selectOnlyGeometry(page, 'ポリゴン');
		await expect(page.getByText('3DSOLID', { exact: true })).toBeVisible();
		await expect(page.getByLabel('test-box', { exact: true })).toBeChecked();
		await expect(page.getByLabel('test-cylinder', { exact: true })).toBeChecked();
		await expect(page.getByLabel('test-sphere', { exact: true })).toBeChecked();
		if (encoding === 'sab') {
			await page.screenshot({ path: testInfo.outputPath('test-acis-form.png') });
		}
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		await expect(
			page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true })
		).toBeAttached();
		if (encoding === 'sab') {
			await page.getByRole('button', { name: '決定', exact: true }).click({ trial: true });
			await page.screenshot({ path: testInfo.outputPath('test-acis-placement.png') });
		}
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText(`test-solids-${encoding}`, { exact: true }).first())
			.toBeVisible();
	});
}

test('全てのACIS部品が未対応なら対象を表示し登録を止める', async ({ page }) => {
	await dropFixture(page, 'test-unsupported-solid.dwg');
	await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
	await expect(page.getByText(/未対応または不正なACIS形状/)).toBeVisible();
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }))
		.toBeDisabled();
});

test(
	'未対応部品を明示して残りを登録し、次のファイルでは除外一覧をリセットする',
	async ({ page }, testInfo) => {
		await dropFixture(page, 'test-partial-solids.dwg');
		await selectOnlyGeometry(page, 'ポリゴン');
		await expect(page.getByRole('region', { name: '変換できない部品', exact: true }))
			.toHaveCount(0);
		await expect(page.getByLabel('test-excluded', { exact: true })).toBeChecked();
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		const excluded = page.getByRole('region', { name: '変換できない部品', exact: true });
		await expect(excluded).toContainText('変換できない1部品を除外しました');
		await expect(excluded).toContainText('test-excluded / 3DSOLID / ID:');
		await expect(excluded).toContainText('未対応または不正なACIS形状');
		await selectOnlyGeometry(page, 'ポリゴン');
		await expect(page.getByLabel('test-valid', { exact: true })).toBeChecked();
		await expect(page.getByLabel('test-excluded', { exact: true })).toBeChecked();
		await page.screenshot({ path: testInfo.outputPath('test-partial-form.png') });
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		await expect(
			page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true })
		).toBeAttached();
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText('test-partial-solids', { exact: true }).first()).toBeVisible();
		await dropFixture(page, 'test-trimmed-solid.dwg');
		await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }))
			.toBeEnabled();
		await expect(excluded).toHaveCount(0);
	}
);

test('DWGの変換待ちでも既存のキャンセルを押せて再読込できる', async ({ page }) => {
	let release = () => {};
	const pending = new Promise<void>(resolve => {
		release = resolve;
	});
	const wasmUrl = '**/vendor/dwg-acis/dwg_acis_bg.wasm';
	await page.route(wasmUrl, async route => {
		await pending;
		// キャンセル済みWorkerのリクエストは中断されている場合がある。
		await route.continue().catch(() => {});
	});
	try {
		await dropFixture(page, 'test-mesh.dwg');
		await expect(
			page.getByRole('status').filter({ hasText: 'DWGの図形・レイヤーを読み取っています' })
		)
			.toBeVisible();
		await expect(page.getByRole('button', { name: '決定', exact: true })).toBeDisabled();
		await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
		await expect(page.getByText('DWGファイルの登録', { exact: true })).toHaveCount(0);
	} finally {
		release();
		await page.unroute(wasmUrl);
	}
	await dropFixture(page, 'test-mesh.dwg');
	await selectOnlyGeometry(page, 'ポリゴン');
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true })).toBeEnabled();
});

test('バイナリで読み込んだACISソリッドを2D輪郭線にして座標選択へ進める', async ({ page }) => {
	await dropFixture(page, 'test-trimmed-solid.dwg');
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true })).toBeEnabled();
	await page.getByLabel('読み込み方式').selectOption('2d-line');
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await expect(page.getByText('投影法選択', { exact: true }).first()).toBeVisible();
});

for (
	const name of [
		'test-shallow-lens',
		'test-curved-band',
		'test-bent-tube',
		'test-planar-slit',
		'test-crossing-trim'
	]
) {
	test(`${name}のACIS面を復元してモデルとして登録する`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		await dropFixture(page, `${name}.dwg`);
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		await expect(page.getByRole('region', { name: '変換できない部品', exact: true }))
			.toHaveCount(0);
		await expect(
			page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true })
		)
			.toBeAttached();
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
		expect(errors).toEqual([]);
	});
}

// Workerへの要求を記録し、確認操作より前に重い変換を開始していないことを検証する。
const trackDwgRequests = async (page: Page, stallConversion = false) => {
	await page.evaluate((stall) => {
		const state = window as unknown as {
			cadRequests: { mode: string; layers?: string[]; }[];
			cadTerminated: number;
		};
		state.cadRequests = [];
		state.cadTerminated = 0;
		const OriginalWorker = window.Worker;
		window.Worker = class extends OriginalWorker {
			postMessage(...args: Parameters<Worker['postMessage']>) {
				const options = args[0]?.options;
				if (options) {
					state.cadRequests.push(structuredClone(options));
					if (stall && options.mode === 'convert') return;
				}
				Reflect.apply(OriginalWorker.prototype.postMessage, this, args);
			}
			terminate() {
				state.cadTerminated++;
				super.terminate();
			}
		};
	}, stallConversion);
};
const dwgRequests = (page: Page) =>
	page.evaluate(() =>
		(window as unknown as { cadRequests: { mode: string; layers?: string[]; }[]; }).cadRequests
	);

test('選択前と単位変更時は一覧取得だけを行い、2D線ではソリッドを変換しない', async ({ page }) => {
	await trackDwgRequests(page);
	await dropFixture(page, 'test-partial-solids.dwg');
	await selectOnlyGeometry(page, 'ポリゴン');
	await page.getByText('test-excluded', { exact: true }).click();
	await page.getByLabel('図面の単位').selectOption('m');
	await expect(page.getByLabel('test-excluded', { exact: true })).not.toBeChecked();
	expect(await dwgRequests(page)).toEqual([{ mode: 'inspect' }]);
	await selectOnlyGeometry(page, 'ライン');
	await page.getByLabel('読み込み方式').selectOption('2d');
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await expect(page.getByText('投影法選択', { exact: true }).first()).toBeVisible();
	expect(await dwgRequests(page)).toEqual([{ mode: 'inspect' }]);
});

test('決定時だけ選択したソリッドを変換する', async ({ page }) => {
	await trackDwgRequests(page);
	await dropFixture(page, 'test-partial-solids.dwg');
	await selectOnlyGeometry(page, 'ポリゴン');
	await page.getByText('test-excluded', { exact: true }).click();
	expect(await dwgRequests(page)).toEqual([{ mode: 'inspect' }]);
	await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
	await expect(page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true }))
		.toBeAttached();
	expect(await dwgRequests(page)).toEqual([{ mode: 'inspect' }, {
		mode: 'convert',
		layers: ['test-valid']
	}]);
});

test('決定後のソリッド変換をキャンセルして再読込できる', async ({ page }) => {
	await trackDwgRequests(page, true);
	await dropFixture(page, 'test-trimmed-solid.dwg');
	await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: '選択した図形を準備しています' }))
		.toBeVisible();
	await expect(page.getByLabel('図面の単位')).toBeDisabled();
	await expect(page.getByRole('progressbar')).not.toHaveAttribute('value');
	await expect.poll(() => dwgRequests(page)).toEqual([{ mode: 'inspect' }, {
		mode: 'convert',
		layers: ['test-trim']
	}]);
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await expect(page.getByText('DWGファイルの登録', { exact: true })).toHaveCount(0);
	await expect.poll(() =>
		page.evaluate(() => (window as unknown as { cadTerminated: number; }).cadTerminated)
	).toBe(2);
	await dropFixture(page, 'test-mesh.dwg');
	await selectOnlyGeometry(page, 'ポリゴン');
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true })).toBeEnabled();
});

for (const mode of ['3d', '2d-line']) {
	test(`GEODATAのあるCADは${mode}で座標選択・手動配置を省略する`, async ({ page }) => {
		await dropFixture(page, 'test-georeferenced.dxf');
		await expect(page.getByText('座標系: EPSG:3857（図面の設定から自動配置）', { exact: true }))
			.toBeVisible();
		await selectOnlyGeometry(page, 'ポリゴン');
		await page.getByLabel('読み込み方式').selectOption(mode);
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
		await expect(page.getByText('投影法選択', { exact: true })).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true })
		).toHaveCount(0);
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText('test-georeferenced', { exact: true }).first()).toBeVisible();
	});
}

const trackSolidWorkers = async (page: Page, stall = false) => {
	await page.evaluate((stall) => {
		const state = window as unknown as {
			cadSolidJobs: Map<Worker, number>;
			cadStopped: Set<Worker>;
			cadRelease: (() => void)[];
		};
		state.cadRelease = [];
		state.cadSolidJobs = new Map();
		state.cadStopped = new Set();
		const OriginalWorker = window.Worker;
		window.Worker = class extends OriginalWorker {
			postMessage(...args: Parameters<Worker['postMessage']>) {
				if (args[0]?.job instanceof Uint8Array) {
					state.cadSolidJobs.set(this, (state.cadSolidJobs.get(this) ?? 0) + 1);
					if (stall) {
						state.cadRelease.push(() =>
							Reflect.apply(OriginalWorker.prototype.postMessage, this, args)
						);
						return;
					}
				}
				Reflect.apply(OriginalWorker.prototype.postMessage, this, args);
			}
			terminate() {
				state.cadStopped.add(this);
				super.terminate();
			}
		};
	}, stall);
};

test('8部品を4つのWorkerで分担してモデル配置へ進む', async ({ page }) => {
	await trackSolidWorkers(page);
	await dropFixture(page, 'test-parallel-solids.dwg');
	await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
	await expect(page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true }))
		.toBeAttached();
	const actual = await page.evaluate(() => {
		const state = window as unknown as {
			cadSolidJobs: Map<Worker, number>;
			cadStopped: Set<Worker>;
		};
		return {
			workers: state.cadSolidJobs.size,
			jobs: [...state.cadSolidJobs.values()].reduce((sum, count) => sum + count, 0),
			stopped: [...state.cadSolidJobs.keys()].every(worker => state.cadStopped.has(worker))
		};
	});
	expect(actual).toEqual({ workers: 4, jobs: 8, stopped: true });
	await expect(page.getByRole('progressbar', { name: 'DWGの処理進捗' })).toHaveCount(0);
});

test('4つのWorkerへ分担した後でもキャンセルして再ドロップできる', async ({ page }) => {
	await trackSolidWorkers(page, true);
	await dropFixture(page, 'test-parallel-solids.dwg');
	await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
	await expect.poll(() =>
		page.evaluate(() =>
			(window as unknown as { cadSolidJobs: Map<Worker, number>; }).cadSolidJobs.size
		)
	).toBe(4);
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	expect(
		await page.evaluate(() => {
			const state = window as unknown as {
				cadSolidJobs: Map<Worker, number>;
				cadStopped: Set<Worker>;
			};
			return {
				stopped: [...state.cadSolidJobs.keys()].every(worker =>
					state.cadStopped.has(worker)
				),
				total: state.cadStopped.size
			};
		})
	).toEqual({ stopped: true, total: 6 }); // 一覧取得1 + 準備1 + 三角形化4
	await dropFixture(page, 'test-mesh.dwg');
	await selectOnlyGeometry(page, 'ポリゴン');
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true })).toBeEnabled();
});

test(
	'部品の完了数と経過時間を表示し、キャンセル後は進捗をリセットする',
	async ({ page }, testInfo) => {
		await trackSolidWorkers(page, true);
		await dropFixture(page, 'test-parallel-solids.dwg');
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		const bar = page.getByRole('progressbar', { name: 'DWGの処理進捗' });
		await expect(bar).toHaveAttribute('max', '8');
		await expect(bar).toHaveAttribute('value', '0');
		await expect.poll(() =>
			page.evaluate(() =>
				(window as unknown as { cadRelease: (() => void)[]; }).cadRelease.length
			)
		).toBe(4);
		await page.evaluate(() =>
			(window as unknown as { cadRelease: (() => void)[]; }).cadRelease.shift()!()
		);
		await expect(bar).toHaveAttribute('value', '1');
		await expect(page.getByText('処理済み 1 / 8 部品', { exact: true })).toBeVisible();
		await expect(page.getByText('12%', { exact: true })).toBeVisible();
		await expect(page.getByText(/^経過 /)).not.toHaveText('経過 0:00');
		await page.screenshot({ path: testInfo.outputPath('dwg-progress-desktop.png') });
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(bar).toBeVisible();
		await page.screenshot({ path: testInfo.outputPath('dwg-progress-mobile.png') });
		await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
		await expect(bar).toHaveCount(0);
		await dropFixture(page, 'test-parallel-solids.dwg');
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		await expect(bar).toHaveAttribute('value', '0');
		await expect(page.getByText('処理済み 0 / 8 部品', { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	}
);

for (const placement of ['embedded', 'zone', 'georef'] as const) {
	test(
		`CADの3種類をまとめてプレビューし、一度の登録で追加する: ${placement}`,
		async ({ page }, testInfo) => {
			const errors: string[] = [];
			page.on('pageerror', error => errors.push(error.message));
			const name = placement === 'embedded' ? 'test-mixed-georeferenced' : 'test-mixed';
			await dropFixture(page, `${name}.dxf`);
			for (const label of ['ポイント', 'ライン', 'ポリゴン']) {
				await expect(page.getByRole('checkbox', { name: label, exact: true }))
					.toBeChecked();
			}
			await page.getByRole('button', { name: '決定', exact: true }).click();
			if (placement !== 'embedded') {
				await expect(page.getByText('投影法選択', { exact: true }).first()).toBeVisible();
				if (placement === 'georef') {
					await page.getByRole('button', { name: '位置合わせ', exact: true }).click();
				}
				await page.getByRole('button', { name: '決定', exact: true }).last().click();
			}
			await expect(page.getByText('3レイヤーをまとめて追加しますか？', { exact: true }))
				.toBeVisible();
			for (const label of ['ポイント', 'ライン', 'ポリゴン']) {
				const entryName = `${name}／${label}`;
				await expect(
					page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
						hasText: entryName
					})
				).toHaveCount(0);
				await page.getByRole('button', { name: entryName, exact: true }).click();
				await expect(page.getByText('3レイヤーをまとめて追加しますか？', { exact: true }))
					.toBeVisible();
			}
			if (placement === 'embedded') {
				await page.screenshot({ path: testInfo.outputPath('cad-group-preview.png') });
			}
			await page.getByRole('button', { name: '地図に追加', exact: true }).click();
			for (const label of ['ポイント', 'ライン', 'ポリゴン']) {
				await expect(
					page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
						hasText: `${name}／${label}`
					})
				).toHaveCount(1);
			}
			await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toHaveCount(
				0
			);
			await dropFixture(page, 'test-mixed.dxf');
			await expect(page.getByRole('checkbox', { name: 'ポイント', exact: true }))
				.toBeChecked();
			expect(errors).toEqual([]);
		}
	);
}

test('複数プレビューのキャンセルで全件を破棄し、選択した種類だけを再登録できる', async ({ page }) => {
	await dropFixture(page, 'test-mixed-georeferenced.dxf');
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await expect(page.getByText('3レイヤーをまとめて追加しますか？', { exact: true }))
		.toBeVisible();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
			hasText: 'test-mixed'
		})
	).toHaveCount(0);
	await dropFixture(page, 'test-mixed-georeferenced.dxf');
	for (const label of ['ポイント', 'ライン', 'ポリゴン']) {
		await page.getByRole('checkbox', { name: label, exact: true }).uncheck();
	}
	await expect(page.getByRole('button', { name: '決定', exact: true })).toBeDisabled();
	await page.getByRole('checkbox', { name: 'ポイント', exact: true }).check();
	await page.getByRole('checkbox', { name: 'ライン', exact: true }).check();
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await expect(page.getByText('2レイヤーをまとめて追加しますか？', { exact: true }))
		.toBeVisible();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
			hasText: 'test-mixed-georeferenced／'
		})
	).toHaveCount(2);
});

test('スマートフォンでも3種類の名前を確認してまとめて登録できる', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await dropFixture(page, 'test-mixed-georeferenced.dxf');
	await expect(page.getByRole('checkbox', { name: 'ポイント', exact: true })).toBeChecked();
	await page.getByRole('button', { name: '決定', exact: true }).click();
	const list = page.getByRole('list', { name: '追加するレイヤー' });
	await expect(list).toBeVisible();
	await expect(list.getByRole('listitem')).toHaveCount(3);
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeInViewport();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click({ trial: true });
	await expect.poll(() => {
		const center = new URL(page.url()).searchParams.get('c') ?? '';
		return Math.abs(Number(center.split('_')[0]));
	}).toBeLessThan(0.1);
	await page.screenshot({ path: testInfo.outputPath('cad-group-mobile.png') });
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('3レイヤーを追加しました', { exact: true })).toBeVisible();
	await expect(list).toHaveCount(0);
});
