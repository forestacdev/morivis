declare module 'fgdb/dist/fgdb.js' {
	const fgdbRead: (table: ArrayBuffer, tablex: ArrayBuffer) => unknown;
	export default fgdbRead;
}
