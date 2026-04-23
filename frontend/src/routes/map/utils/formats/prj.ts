import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';

/**
 * PRJファイルをダウンロード
 */
export const downloadPrjFile = (epsg: EpsgCode, filename: string = 'map.prj') => {
	const prjContent = getProjContext(epsg);
	console.log('PRJ Content:', prjContent); // デバッグ用ログ
	const blob = new Blob([prjContent], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};
