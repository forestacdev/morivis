import type { InputResourceLimits } from './resource-limits';

/** UIやデコーダーを参照しない、入力形式の静的な定義。 */
export interface FormatDefinition {
	readonly id: string;
	readonly extensions: readonly string[];
	readonly variants?: readonly FormatDefinition[];
	readonly limits?: InputResourceLimits & {
		readonly maxOutputBytes?: number;
		readonly maxFeatures?: number;
		readonly maxVertices?: number;
		readonly maxSourcePoints?: number;
		readonly maxDisplayPoints?: number;
		readonly maxHeaderBytes?: number;
		readonly maxMetadataBytes?: number;
		readonly maxSamples?: number;
		readonly maxExpandedBytes?: number;
		readonly maxNbtBytes?: number;
		readonly maxSections?: number;
		/** UTF-16コード単位。ファイル容量とは区別する。 */
		readonly maxTextLength?: number;
		readonly timeoutMs?: number;
	};
	readonly files?: {
		readonly mainExtensions?: readonly string[];
		readonly headerExtensions?: readonly string[];
		readonly dataExtensions?: readonly string[];
		readonly attributeExtensions?: readonly string[];
		readonly requiredExtensions?: readonly string[];
		readonly optionalExtensions?: readonly string[];
		readonly grouping?: 'same-path-stem' | 'header-reference';
	};
}

/** 拡張子の一致だけを調べる。同じ拡張子を使う別形式の内容判定は各パーサーに残す。 */
export const hasFormatExtension = (name: string, extensions: readonly string[]): boolean =>
	extensions.some(extension => name.toLowerCase().endsWith(extension));
