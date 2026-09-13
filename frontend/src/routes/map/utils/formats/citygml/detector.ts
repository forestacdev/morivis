/** 接頭辞に依存せず、CityGMLの名前空間宣言を判定する。 */
export const isCityGml = (text: string): boolean =>
	/xmlns(?::[\w.-]+)?\s*=\s*["']https?:\/\/www\.opengis\.net\/citygml(?:\/[^"']*)?["']/i.test(
		text
	);

export const isCityGmlFile = async (file: File): Promise<boolean> =>
	isCityGml(await file.slice(0, 65536).text());
