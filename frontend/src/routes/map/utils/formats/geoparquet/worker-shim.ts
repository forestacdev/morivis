const workerGlobal = globalThis as typeof globalThis & {
	global?: typeof globalThis;
};

if (!workerGlobal.global) {
	workerGlobal.global = workerGlobal;
}
