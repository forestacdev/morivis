const TERMS_ACCEPTED_KEY = 'isTermsAccepted';

// localストレージにデータを保存する関数
export const saveToTermsAccepted = () => {
	localStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
};

export const checkToTermsAccepted = () => {
	return localStorage.getItem(TERMS_ACCEPTED_KEY) === 'true';
};
