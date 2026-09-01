export type GmlDialect = 'fgd' | 'ksj' | 'generic';

const FGD_MARKERS = ['fgd.gsi.go.jp'];

const KSJ_MARKERS = ['nlftp.mlit.go.jp/ksj', '/ksj/schemas/', 'KsjTmplt-'];

export const isFgdGml = (text: string): boolean =>
	FGD_MARKERS.some((marker) => text.includes(marker));

export const isKsjGml = (text: string): boolean =>
	KSJ_MARKERS.some((marker) => text.includes(marker));

export const detectGmlDialect = (text: string): GmlDialect => {
	if (isFgdGml(text)) return 'fgd';
	if (isKsjGml(text)) return 'ksj';
	return 'generic';
};
