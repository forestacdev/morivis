import { formatE57 } from '../e57/definition';
import type { FormatDefinition } from '../format-definition';

export const formatPointcloud = {
	id: 'pointcloud',
	extensions: [
		'.copc.laz',
		'.las',
		'.laz',
		'.ply',
		'.pcd',
		...formatE57.extensions,
		'.xyz',
		'.txt'
	],
	variants: [formatE57]
} as const satisfies FormatDefinition;
