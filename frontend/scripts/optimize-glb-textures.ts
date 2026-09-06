import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

export const TEXTURE_OPTIMIZATION_DEFAULTS = {
	quality: 80
} as const;

export interface TextureOptimizationOptions {
	inputPath: string;
	outputPath: string;
	quality: number;
}

const USAGE = `GLB 内のテクスチャを WebP に変換します。

使い方:
  pnpm --dir frontend texture:optimize <input.glb> [options]

オプション:
  --quality <1-100>  WebP の画質（初期値: ${TEXTURE_OPTIMIZATION_DEFAULTS.quality}）
  --output <path>    出力 GLB（初期値: <name>.webp.glb）
  --help             この説明を表示`;

const parseQuality = (value: string) => {
	const quality = Number(value);
	if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
		throw new Error('--quality は 1 から 100 の整数を指定してください。');
	}
	return quality;
};

const getOptionValue = (args: string[], index: number, option: string) => {
	const value = args[index + 1];
	if (!value || value.startsWith('--')) {
		throw new Error(`${option} には値を指定してください。`);
	}
	return value;
};

export const getTextureOptimizationOutputPath = (inputPath: string, outputPath?: string) => {
	if (outputPath) return outputPath;
	const { dir, name } = path.parse(inputPath);
	return path.join(dir, `${name}.webp.glb`);
};

export const parseTextureOptimizationArguments = (
	args: string[],
	cwd: string
): TextureOptimizationOptions | null => {
	let inputPath: string | undefined;
	let outputPath: string | undefined;
	let quality = TEXTURE_OPTIMIZATION_DEFAULTS.quality;

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === '--help') return null;
		if (argument === '--quality') {
			quality = parseQuality(getOptionValue(args, index, argument));
			index += 1;
			continue;
		}
		if (argument === '--output') {
			outputPath = getOptionValue(args, index, argument);
			index += 1;
			continue;
		}
		if (argument.startsWith('--')) {
			throw new Error(`未対応のオプションです: ${argument}`);
		}
		if (inputPath) {
			throw new Error('入力 GLB は 1 ファイルだけ指定してください。');
		}
		inputPath = argument;
	}

	if (!inputPath) throw new Error('入力 GLB を指定してください。');
	if (path.extname(inputPath).toLowerCase() !== '.glb') {
		throw new Error('入力は .glb ファイルにしてください。');
	}

	const resolvedInputPath = path.resolve(cwd, inputPath);
	const resolvedOutputPath = path.resolve(
		cwd,
		getTextureOptimizationOutputPath(inputPath, outputPath)
	);
	if (resolvedInputPath === resolvedOutputPath) {
		throw new Error(
			'入力ファイルを上書きできません。--output に別のファイル名を指定してください。'
		);
	}
	if (path.extname(resolvedOutputPath).toLowerCase() !== '.glb') {
		throw new Error('--output は .glb ファイルにしてください。');
	}

	return {
		inputPath: resolvedInputPath,
		outputPath: resolvedOutputPath,
		quality
	};
};

const createIo = async () => {
	await MeshoptDecoder.ready;
	const [dracoDecoder, dracoEncoder] = await Promise.all([
		draco3d.createDecoderModule(),
		draco3d.createEncoderModule()
	]);
	return new NodeIO()
		.registerExtensions(ALL_EXTENSIONS)
		.registerDependencies({
			'draco3d.decoder': dracoDecoder,
			'draco3d.encoder': dracoEncoder,
			'meshopt.decoder': MeshoptDecoder
		});
};

export const optimizeGlbTextures = async (options: TextureOptimizationOptions) => {
	const inputStat = await stat(options.inputPath);
	if (!inputStat.isFile()) {
		throw new Error(`入力ファイルではありません: ${options.inputPath}`);
	}

	await mkdir(path.dirname(options.outputPath), { recursive: true });
	const io = await createIo();
	const document = await io.read(options.inputPath);
	const textureCount = document.getRoot().listTextures().length;
	await document.transform(
		textureCompress({
			encoder: sharp,
			quality: options.quality,
			targetFormat: 'webp'
		})
	);
	await io.write(options.outputPath, document);
	console.info(
		`[texture] ${textureCount} textures -> WebP (quality ${options.quality}): ${options.outputPath}`
	);
};

const run = async () => {
	try {
		const options = parseTextureOptimizationArguments(process.argv.slice(2), process.cwd());
		if (!options) {
			console.info(USAGE);
			return;
		}
		await optimizeGlbTextures(options);
	} catch (error) {
		console.error(`[texture] ${error instanceof Error ? error.message : String(error)}`);
		console.error(`\n${USAGE}`);
		process.exitCode = 1;
	}
};

const isMainModule = process.argv[1]
	&& path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
	void run();
}
