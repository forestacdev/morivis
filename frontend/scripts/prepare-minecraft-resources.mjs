import JSZip from 'jszip';
import { lstat, mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const target = path.join(projectRoot, 'frontend/static/minecraft');
/** @param {string} value */
const insideProject = (value) => {
	const relative = path.relative(projectRoot, value);
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error('素材はプロジェクト内に配置してください');
	}
};
const assetPattern =
	/^assets\/([a-z0-9_.-]+)\/(blockstates|models|textures)\/([a-z0-9_./-]+)\.(json|png|png\.mcmeta)$/;
/** @param {string} name */
const assetId = (name) => {
	const match = name.match(assetPattern);
	if (!match || name.split('/').some((part) => part === '..' || part === '.' || !part)) {
		return null;
	}
	if ((match[2] === 'textures') !== (match[4] !== 'json')) return null;
	return { category: match[2], id: `${match[1]}:${match[3]}` };
};

/** @param {string} destination */
const rejectSymlink = async (destination) => {
	try {
		if ((await lstat(destination)).isSymbolicLink())
			throw new Error('配置先のシンボリックリンクは使用できません');
	} catch (error) {
		if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
	}
};

/**
 * @param {string} sourcePath
 * @param {string | null} version
 * @param {string} output
 */
export const prepareMinecraftResources = async (sourcePath, version = null, output = target) => {
	insideProject(path.resolve(output));
	const source = await realpath(path.resolve(projectRoot, sourcePath));
	insideProject(source);
	/** @type {Map<string, () => Promise<Buffer>>} */
	const files = new Map();
	if (/\.(jar|zip)$/i.test(source)) {
		const zip = await JSZip.loadAsync(await readFile(source));
		for (const [name, entry] of Object.entries(zip.files)) {
			if (!entry.dir && assetId(name)) files.set(name, () => entry.async('nodebuffer'));
		}
	} else {
		/** @param {string} directory @param {string} prefix */
		const walk = async (directory, prefix = '') => {
			for (const entry of await readdir(directory, { withFileTypes: true })) {
				if (entry.isSymbolicLink()) {
					throw new Error('素材フォルダー内のシンボリックリンクは使用できません');
				}
				const name = prefix + entry.name;
				const location = path.join(directory, entry.name);
				if (entry.isDirectory()) await walk(location, `${name}/`);
				else if (assetId(name)) files.set(name, () => readFile(location));
			}
		};
		// assets自体、またはassetsを含むリソースパックのルートを指定できる。
		await walk(source, path.basename(source) === 'assets' ? 'assets/' : '');
	}
	const blockstates = [...files.keys()]
		.map(assetId)
		.filter((item) => item?.category === 'blockstates')
		.map((item) => item?.id ?? '')
		.sort();
	if (!blockstates.length) throw new Error('assets/<namespace>/blockstates/*.json がありません');
	// 読み取り・JSON検証を完了してから配信用のファイルを書き出す。
	const contents = new Map();
	/** @type {Record<string, unknown>} */
	const animations = {};
	for (const [name, read] of files) {
		const bytes = await read();
		if (name.endsWith('.json') || name.endsWith('.mcmeta')) {
			const json = JSON.parse(bytes.toString('utf8'));
			if (name.endsWith('.mcmeta') && json.animation) {
				const entry = assetId(name);
				if (entry) animations[entry.id] = json.animation;
			}
		}
		contents.set(name, bytes);
	}
	for (const [name, bytes] of contents) {
		const destination = path.join(output, name);
		await mkdir(path.dirname(destination), { recursive: true });
		// 配置先もプロジェクト内であることを、既存symlinkの解決後に確認する。
		insideProject(await realpath(path.dirname(destination)));
		await rejectSymlink(destination);
		await writeFile(destination, bytes, { flag: 'w' });
	}
	await rejectSymlink(path.join(output, 'manifest.json'));
	const manifest = {
		format: 1,
		minecraftVersion: version,
		blockstates,
		...(Object.keys(animations).length && { animations })
	};
	await writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, '\t')}\n`);
	return { files: files.size, blockstates: blockstates.length };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [source, version] = process.argv.slice(2);
	if (!source) {
		console.error(
			'Usage: pnpm --dir frontend minecraft:prepare <プロジェクト内の.jar/.zip/素材フォルダー> [Minecraftバージョン]'
		);
		process.exitCode = 1;
	} else {
		try {
			const result = await prepareMinecraftResources(source, version);
			console.log(
				`${result.blockstates}ブロック定義、${result.files}ファイルを frontend/static/minecraft/ に配置しました`
			);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	}
}
