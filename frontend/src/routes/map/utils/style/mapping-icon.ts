import type { ExpressionType } from '$routes/map/data/types/vector/style';

type MappingType = 'single' | 'match' | 'linear' | 'step' | 'raw';

/** スタイルマッピング種別に対応するアイコンを取得する */
export const getIconStyle = (type: MappingType, expressionType: ExpressionType) => {
	let defaultIcon;

	if (expressionType === 'color') {
		defaultIcon = 'bxs:color-fill';
	} else if (expressionType === 'number') {
		defaultIcon = 'lsicon:number-filled';
	} else {
		defaultIcon = 'bxs:color-fill';
	}

	if (!type) return defaultIcon;
	switch (type) {
		case 'match':
			return 'material-symbols:category-rounded';
		case 'step':
			return 'subway:step-1';
		case 'linear':
			return 'mdi:graph-bell-curve-cumulative';
		case 'raw':
			return 'mdi:multiplication';
		default:
			return defaultIcon;
	}
};
