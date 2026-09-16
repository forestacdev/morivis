/** 汎用.jsonはルートのtypeだけを見る。地物の属性にあるtypeは判定に使わない。 */
export const isCityJsonFile = async (file: File): Promise<boolean> => {
	if (/\.(?:city\.json|cityjson)$/i.test(file.name)) return true;
	try {
		const data: unknown = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
		return !!data && typeof data === 'object' && !Array.isArray(data)
			&& 'type' in data && data.type === 'CityJSON';
	} catch {
		return false;
	}
};
