export class SxfParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SxfParseError';
	}
}
