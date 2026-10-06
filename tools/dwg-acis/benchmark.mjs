import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const seconds = (start) => (performance.now() - start) / 1000;
const loadRuntime = async (runtime) => {
	const api = await import(pathToFileURL(runtime).href);
	const wasm = await readFile(resolve(runtime, '../dwg_acis_bg.wasm'));
	api.initSync({ module: wasm });
	return api;
};

const runWorker = async () => {
	const { mesh_dwg_solid } = await loadRuntime(workerData.runtime);
	parentPort.on('message', ({ index, bytes }) => {
		const started = performance.now();
		const output = mesh_dwg_solid(bytes);
		const elapsed = seconds(started);
		const buffer = Buffer.from(output.buffer, output.byteOffset, output.byteLength);
		if (buffer.toString('ascii', 0, 4) !== 'MDW1') throw new Error('Invalid MDW1 output');
		const header = JSON.parse(buffer.toString('utf8', 8, 8 + buffer.readUInt32LE(4)));
		parentPort.postMessage({
			index,
			seconds: elapsed,
			sha256: digest(buffer),
			solids: header.solids.length,
			triangles: header.solids.reduce((sum, solid) => sum + solid.triangleCount, 0),
			skipped: header.skippedSolids.length
		});
	});
	parentPort.postMessage({ ready: true });
};

const run = async () => {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			runtime: { type: 'string' },
			workers: { type: 'string', default: '4' },
			handle: { type: 'string', multiple: true },
			help: { type: 'boolean', short: 'h' }
		}
	});
	if (values.help) {
		console.log(
			'node tools/dwg-acis/benchmark.mjs input.dwg [--runtime path/to/dwg_acis.js] [--workers 1..4] [--handle 0x123]'
		);
		return;
	}
	if (positionals.length !== 1) throw new Error('Specify one input DWG file (see --help)');
	const workerCount = Number(values.workers);
	if (!Number.isInteger(workerCount) || workerCount < 1 || workerCount > 4) {
		throw new Error('--workers must be an integer from 1 to 4');
	}
	const runtime = values.runtime
		? resolve(values.runtime)
		: fileURLToPath(
			new URL('../../frontend/static/vendor/dwg-acis/dwg_acis.js', import.meta.url)
		);
	const input = await readFile(resolve(positionals[0]));
	const started = performance.now();
	const { prepare_dwg } = await loadRuntime(runtime);
	const prepareStarted = performance.now();
	const prepared = prepare_dwg(input, 'null');
	const requested = new Set(values.handle?.map((handle) => handle.toLowerCase()));
	const found = new Set();
	const jobs = [];
	let drawing;
	try {
		drawing = prepared.drawing();
		const count = prepared.job_count();
		for (let index = 0; index < count; index++) {
			const bytes = prepared.next_job();
			const { handle } = JSON.parse(Buffer.from(bytes).toString('utf8'));
			if (requested.size && !requested.has(handle.toLowerCase())) continue;
			found.add(handle.toLowerCase());
			jobs.push({ bytes, handle });
		}
	} finally {
		prepared.free();
	}
	for (const handle of requested) {
		if (!found.has(handle)) throw new Error(`Solid handle not found: ${handle}`);
	}
	const prepareSeconds = seconds(prepareStarted);
	const results = new Array(jobs.length);
	const workers = [];
	const meshStarted = performance.now();
	let next = 0;
	try {
		await Promise.all(
			Array.from({ length: Math.min(workerCount, jobs.length) }, () =>
				new Promise((resolveWorker, reject) => {
					const worker = new Worker(new URL(import.meta.url), {
						workerData: { runtime }
					});
					workers.push(worker);
					let finished = false;
					worker.on('error', reject);
					worker.on('exit', (code) => {
						if (!finished) {
							reject(new Error(`Worker exited before completion (${code})`));
						}
					});
					worker.on('message', (result) => {
						if (!result.ready) {
							results[result.index] = result;
						}
						if (next === jobs.length) {
							finished = true;
							resolveWorker();
							return;
						}
						const index = next++;
						const { bytes } = jobs[index];
						worker.postMessage({ index, bytes }, [bytes.buffer]);
					});
				}))
		);
	} finally {
		await Promise.all(workers.map((worker) => worker.terminate()));
	}
	const meshSeconds = seconds(meshStarted);
	const totalSeconds = seconds(started);
	const sum = (key) => results.reduce((total, result) => total + result[key], 0);
	console.log(JSON.stringify(
		{
			node: process.version,
			workers: workerCount,
			jobs: jobs.length,
			prepareSeconds,
			meshSeconds,
			totalSeconds,
			solids: sum('solids'),
			triangles: sum('triangles'),
			skipped: sum('skipped')
				+ (requested.size ? 0 : JSON.parse(drawing).skippedSolids.length),
			drawingSha256: digest(drawing),
			meshSha256: digest(results.map((result) => result.sha256).join('\n')),
			slowest: results.toSorted((a, b) => b.seconds - a.seconds).slice(0, 10).map((
				result
			) => ({
				handle: jobs[result.index].handle,
				seconds: result.seconds,
				triangles: result.triangles,
				skipped: result.skipped,
				sha256: result.sha256
			}))
		},
		null,
		2
	));
};

await (isMainThread ? run() : runWorker());
