declare module 'jsfive' {
	export class File extends Group {
		constructor(buffer: ArrayBuffer, name?: string);
		attrs: Record<string, unknown>;
	}

	export class Dataset {
		shape: number[];
		dtype: string;
		value: unknown;
		attrs: Record<string, unknown>;
	}

	export class Group {
		keys: string[];
		get(path: string): Dataset | Group | undefined;
	}
}
