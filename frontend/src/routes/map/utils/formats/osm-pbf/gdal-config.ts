/** OSM変換専用WorkerのGDAL設定。他形式のSQLite処理には適用しない。 */
export const OSM_PBF_GDAL_ENV = {
	PROJ_NETWORK: 'OFF',
	// Emscriptenでは、使用中の一時SQLiteをunlinkすると再アクセス時にI/Oエラーになる。
	// GDALCloseまで名前を保持する。Worker終了時にも仮想ファイルシステム全体が破棄される。
	OSM_UNLINK_TMPFILE: 'NO'
};
