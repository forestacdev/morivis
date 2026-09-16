import { SUPPORTED_FILE_ACCEPT } from '$routes/map/types';
import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDroppedFiles } from './upload-drop';

const { extractRikModelFiles } = vi.hoisted(() => ({ extractRikModelFiles: vi.fn() }));
vi.mock('$routes/map/utils/formats/rik/analyze', () => ({ extractRikModelFiles }));

describe('RIKアップロード', () => {
	const modelFiles = [new File(['test'], 'test-model.3ds'), new File(['test'], 'test-image.png')];
	beforeEach(() => {
		extractRikModelFiles.mockReset();
		extractRikModelFiles.mockResolvedValue(modelFiles);
	});

	it.each(['test.rik', 'test.RIK'])(
		'単体とフォルダ入力をモデルフォームへ渡す: %s',
		async name => {
			const file = new File(['test'], name);
			for (const input of [file, [file], [new File(['test'], 'test-cover.jpg'), file]]) {
				expect(await resolveDroppedFiles(input)).toEqual({
					type: 'dialog',
					dialogType: 'model',
					dropFiles: modelFiles
				});
			}
			expect(extractRikModelFiles).toHaveBeenCalledWith(file);
			expect(SUPPORTED_FILE_ACCEPT.split(',')).toContain('.rik');
		}
	);

	it('ZIP内のRIKを展開する', async () => {
		const zip = new JSZip();
		zip.file('test-folder/test.rik', 'test');
		const file = new File([await zip.generateAsync({ type: 'arraybuffer' })], 'test.zip');
		expect(await resolveDroppedFiles(file)).toMatchObject({
			dialogType: 'model',
			dropFiles: modelFiles
		});
	});

	it('展開エラーをユーザー向け通知にする', async () => {
		extractRikModelFiles.mockRejectedValue(new Error('GSMを格納したRIKには対応していません'));
		expect(await resolveDroppedFiles(new File(['test'], 'test.rik'))).toEqual({
			type: 'notification',
			level: 'error',
			message: 'GSMを格納したRIKには対応していません'
		});
	});

	it('複数のRIKを黙って1つに絞らない', async () => {
		expect(
			await resolveDroppedFiles([
				new File(['test'], 'test-a.rik'),
				new File(['test'], 'test-b.rik')
			])
		)
			.toMatchObject({
				type: 'notification',
				message: 'RIKファイルは1つずつ読み込んでください'
			});
		expect(extractRikModelFiles).not.toHaveBeenCalled();
	});
});
