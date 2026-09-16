import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { createRikModelFiles } from '.';
import { createTest3ds, createTestCabinet } from './__fixtures__/cabinet';
import {
	type CabinetRuntimeFactory,
	extractRikCabinet,
	inspectRikCabinet,
	type RikArchiveFile
} from './cabinet';

const entry = (path: string, data: string | Uint8Array<ArrayBuffer>): RikArchiveFile => ({
	path,
	data: typeof data === 'string' ? new TextEncoder().encode(data) : data
});

describe('RIK / CAB', () => {
	it('実際のWASMで合成CABを展開し、モデルと画像を既存フォーム用のFileへ変換する', async () => {
		const vendor = resolve(import.meta.dirname, '../../../../../../static/vendor/7z-wasm');
		const moduleUrl = pathToFileURL(resolve(vendor, '7zz.es6.js')).href;
		const { default: factory } = await import(/* @vite-ignore */ moduleUrl) as {
			default: CabinetRuntimeFactory;
		};
		const runtime = await factory({
			wasmBinary: readFileSync(resolve(vendor, '7zz.wasm')),
			print: () => {},
			printErr: () => {}
		});
		const files = createRikModelFiles(extractRikCabinet(createTestCabinet(), runtime));
		expect(files.map(({ name }) => name)).toEqual(['test-model.3ds', 'test-texture.png']);
		expect(files[1].type).toBe('image/png');
		expect(new Uint8Array(await files[0].arrayBuffer())).toEqual(createTest3ds());
	});

	it('Info.iniの指定とサブディレクトリ・大小文字を保ってモデルを選ぶ', () => {
		const files = createRikModelFiles([
			entry(
				'test-folder/Info.ini',
				'[3DS_DATA]\r\n3DS_FILE_NAME="TEST-B.3ds"\r\n[SIKICHI]\r\nPOINT_CNT=0'
			),
			entry('test-folder/test-a.3ds', createTest3ds()),
			entry('test-folder/test-b.3ds', createTest3ds()),
			entry('test-folder/textures/test-image.png', new Uint8Array([1]))
		]);
		expect(files.map(({ name }) => name)).toEqual(['test-b.3ds', 'test-image.png']);
		expect((files[1] as File & { morivisRelativePath: string; }).morivisRelativePath)
			.toBe('test-folder/textures/test-image.png');
	});

	it('INIなしの単一3DSに対応する', () => {
		expect(createRikModelFiles([entry('test-model.3ds', createTest3ds())])).toHaveLength(1);
	});

	it.each([
		{ entries: [entry('test-model.gsm', '')], error: 'GSM' },
		{ entries: [entry('test-image.png', '')], error: '3DSモデルがありません' },
		{
			entries: [entry('test-a.3ds', createTest3ds()), entry('test-b.3ds', createTest3ds())],
			error: '複数'
		},
		{
			entries: [
				entry('Info.ini', '[3DS_DATA]\n3DS_FILE_NAME=test-missing.3ds'),
				entry('test-a.3ds', createTest3ds())
			],
			error: '指定された'
		},
		{ entries: [entry('test-model.3ds', 'invalid')], error: '破損' }
	])('未対応・不正な内容を通知する: $error', ({ entries, error }) => {
		expect(() => createRikModelFiles(entries)).toThrow(error);
	});

	it.each(['../test.3ds', '/test.3ds', 'C:\\test.3ds', 'test/../../test.3ds'])(
		'不正なパスを展開前に拒否する: %s',
		path => {
			expect(() => inspectRikCabinet(createTestCabinet([{ path, data: createTest3ds() }])))
				.toThrow('パス');
		}
	);

	it('壊れたヘッダー、切り詰め、分割CAB、過大サイズを拒否する', () => {
		expect(() => inspectRikCabinet(new ArrayBuffer(36))).toThrow('CAB形式');
		expect(() => inspectRikCabinet(createTestCabinet().slice(0, -1))).toThrow('破損');
		const split = createTestCabinet();
		new DataView(split).setUint16(30, 1, true);
		expect(() => inspectRikCabinet(split)).toThrow('分割');
		const large = createTestCabinet();
		new DataView(large).setUint32(44, 0xffffffff, true);
		expect(() => inspectRikCabinet(large)).toThrow('上限');
	});

	it('大小文字だけ異なる重複名を拒否する', () => {
		expect(() =>
			inspectRikCabinet(createTestCabinet([
				{ path: 'test.3ds', data: createTest3ds() },
				{ path: 'TEST.3ds', data: createTest3ds() }
			]))
		).toThrow('重複');
	});

	it('展開に失敗したCABを部分的に読み込まない', () => {
		const readFile = vi.fn();
		expect(() =>
			extractRikCabinet(createTestCabinet(), {
				FS: { writeFile: vi.fn(), readFile },
				callMain: () => 2
			})
		).toThrow('CAB展開に失敗');
		expect(readFile).not.toHaveBeenCalled();
	});
});
