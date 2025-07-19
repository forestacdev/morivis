// localストレージにデータを保存する関数
export const saveToTermsAccepted = () => {
	localStorage.setItem('isTermsAccepted', 'true');
};

export const checkToTermsAccepted = () => {
	return localStorage.getItem('isTermsAccepted') === 'true';
};
