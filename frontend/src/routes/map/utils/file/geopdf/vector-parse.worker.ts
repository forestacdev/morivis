/**
 * Web Worker for parsing GeoPDF vector content streams.
 * Heavy parsing is offloaded here to avoid blocking the main thread.
 */

import { parseContentStream } from './vector-parser';
import type { VectorParseOptions, VectorFeature } from './vector-parser';

export interface VectorParseMessage {
	content: string;
	options: VectorParseOptions;
}

export interface VectorParseResult {
	features: VectorFeature[];
	error?: string;
}

self.onmessage = (e: MessageEvent<VectorParseMessage>) => {
	try {
		const { content, options } = e.data;
		const features = parseContentStream(content, options);
		self.postMessage({ features } satisfies VectorParseResult);
	} catch (error) {
		self.postMessage({
			features: [],
			error: error instanceof Error ? error.message : 'Unknown error'
		} satisfies VectorParseResult);
	}
};
