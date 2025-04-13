self.onmessage = async (event) => {
	const { urls } = event.data;

	try {
		// 並列処理を Promise.all() で実行
		const blobUrls = await Promise.all(
			urls.map(async (url) => {
				const response = await fetch(url);
				const blob = await response.blob();
				return URL.createObjectURL(blob);
			})
		);

		// メインスレッドに送信
		self.postMessage({ blobUrls });
	} catch (error) {
		self.postMessage({ error: 'テクスチャのロードに失敗しました' });
	}
};
