import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
	cloneDocument,
	dedup,
	draco,
	flatten,
	join,
	prune,
	simplify,
	textureCompress,
	weld
} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

export const LOD_DEFAULTS = {
	error: 0.001,
	lowRatio: 0.15,
	lowTextureSize: 512,
	mediumRatio: 0.5,
	mediumTextureSize: 1024,
	textureQuality: 80
} as const;

export interface LodGenerationOptions {
	error: number;
	inputPath: string;
	lowRatio: number;
	lowTextureSize: number;
	mediumRatio: number;
	mediumTextureSize: number;
	outputDirectory: string;
	textureQuality: number;
}

export interface LodOutputPaths {
	low: string;
	medium: string;
}

const USAGE = `GLB から medium / low LOD を生成します。

使い方:
  pnpm --dir frontend lod:generate <input.glb> [options]

オプション:
  --out-dir <dir>       出力先ディレクトリ（初期値: 入力ファイルと同じ場所）
  --medium-ratio <0-1>  medium の頂点比率（初期値: ${LOD_DEFAULTS.mediumRatio}）
  --low-ratio <0-1>     low の頂点比率（初期値: ${LOD_DEFAULTS.lowRatio}）
	--medium-texture-size <px>  medium のテクスチャ最大辺（初期値: ${LOD_DEFAULTS.mediumTextureSize}）
	--low-texture-size <px>     low のテクスチャ最大辺（初期値: ${LOD_DEFAULTS.lowTextureSize}）
	--texture-quality <1-100>   WebP の画質（初期値: ${LOD_DEFAULTS.textureQuality}）
  --error <number>      許容する形状誤差（初期値: ${LOD_DEFAULTS.error}）
  --help                この説明を表示

出力:
  <name>.medium.glb
  <name>.low.glb`;

const parseNumber = (
	value: string,
	option: string,
	minimum: number,
	maximum = Number.POSITIVE_INFINITY
) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
		throw new Error(
			`${option} は ${minimum} 以上${
				Number.isFinite(maximum) ? ` ${maximum} 以下` : ''
			}の数値を指定してください。`
		);
	}
	return parsed;
};

const parseInteger = (value: string, option: string, minimum: number, maximum: number) => {
	const parsed = parseNumber(value, option, minimum, maximum);
	if (!Number.isInteger(parsed)) {
		throw new Error(`${option} は整数を指定してください。`);
	}
	return parsed;
};

const getOptionValue = (args: string[], index: number, option: string) => {
	const value = args[index + 1];
	if (!value || value.startsWith('--')) {
		throw new Error(`${option} には値を指定してください。`);
	}
	return value;
};

export const parseLodArguments = (args: string[], cwd: string): LodGenerationOptions | null => {
	let inputPath: string | undefined;
	let outputDirectory: string | undefined;
	let mediumRatio = LOD_DEFAULTS.mediumRatio;
	let lowRatio = LOD_DEFAULTS.lowRatio;
	let mediumTextureSize = LOD_DEFAULTS.mediumTextureSize;
	let lowTextureSize = LOD_DEFAULTS.lowTextureSize;
	let textureQuality = LOD_DEFAULTS.textureQuality;
	let error = LOD_DEFAULTS.error;

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === '--help') return null;

		if (argument === '--out-dir') {
			outputDirectory = getOptionValue(args, index, argument);
			index += 1;
			continue;
		}
		if (argument === '--medium-ratio') {
			mediumRatio = parseNumber(getOptionValue(args, index, argument), argument, 0.01, 1);
			index += 1;
			continue;
		}
		if (argument === '--low-ratio') {
			lowRatio = parseNumber(getOptionValue(args, index, argument), argument, 0.01, 1);
			index += 1;
			continue;
		}
		if (argument === '--medium-texture-size') {
			mediumTextureSize = parseInteger(
				getOptionValue(args, index, argument),
				argument,
				1,
				16384
			);
			index += 1;
			continue;
		}
		if (argument === '--low-texture-size') {
			lowTextureSize = parseInteger(
				getOptionValue(args, index, argument),
				argument,
				1,
				16384
			);
			index += 1;
			continue;
		}
		if (argument === '--texture-quality') {
			textureQuality = parseInteger(
				getOptionValue(args, index, argument),
				argument,
				1,
				100
			);
			index += 1;
			continue;
		}
		if (argument === '--error') {
			error = parseNumber(getOptionValue(args, index, argument), argument, 0, 1);
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

	if (!inputPath) {
		throw new Error('入力 GLB を指定してください。');
	}
	if (path.extname(inputPath).toLowerCase() !== '.glb') {
		throw new Error('入力は .glb ファイルにしてください。');
	}
	if (lowRatio >= mediumRatio) {
		throw new Error('--low-ratio は --medium-ratio より小さくしてください。');
	}

	const resolvedInputPath = path.resolve(cwd, inputPath);
	return {
		error,
		inputPath: resolvedInputPath,
		lowRatio,
		lowTextureSize,
		mediumRatio,
		mediumTextureSize,
		outputDirectory: path.resolve(cwd, outputDirectory ?? path.dirname(inputPath)),
		textureQuality
	};
};

export const getLodOutputPaths = (
	{ inputPath, outputDirectory }: LodGenerationOptions
): LodOutputPaths => {
	const { name } = path.parse(inputPath);
	return {
		low: path.join(outputDirectory, `${name}.low.glb`),
		medium: path.join(outputDirectory, `${name}.medium.glb`)
	};
};

const createIo = async () => {
	await Promise.all([MeshoptDecoder.ready, MeshoptSimplifier.ready]);
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

const formatRatio = (ratio: number) => `${Math.round(ratio * 100)}%`;

export const generateModelLods = async (options: LodGenerationOptions): Promise<LodOutputPaths> => {
	const inputStat = await stat(options.inputPath);
	if (!inputStat.isFile()) {
		throw new Error(`入力ファイルではありません: ${options.inputPath}`);
	}

	await mkdir(options.outputDirectory, { recursive: true });
	const io = await createIo();
	const sourceDocument = await io.read(options.inputPath);
	const outputs = getLodOutputPaths(options);
	const levels = [
		{
			name: 'medium',
			outputPath: outputs.medium,
			ratio: options.mediumRatio,
			textureSize: options.mediumTextureSize
		},
		{
			name: 'low',
			outputPath: outputs.low,
			ratio: options.lowRatio,
			textureSize: options.lowTextureSize
		}
	] as const;

	for (const level of levels) {
		// 各 LOD は元の詳細モデルから作り、低 LOD に中 LOD の誤差を重ねない。
		const document = cloneDocument(sourceDocument);
		await document.transform(
			weld(),
			simplify({
				error: options.error,
				ratio: level.ratio,
				simplifier: MeshoptSimplifier
			}),
			// LODは遠景表示用なので、静的部材を同一マテリアルごとに結合して描画呼び出しを減らす。
			// 異なるマテリアル、スキニング、アニメーションは互換性を保つため結合しない。
			dedup({ propertyTypes: [PropertyType.MATERIAL] }),
			flatten(),
			join(),
			textureCompress({
				encoder: sharp,
				quality: options.textureQuality,
				resize: [level.textureSize, level.textureSize],
				targetFormat: 'webp'
			}),
			// Three.js 側で DRACOLoader を設定済みのため、LOD の頂点データも再圧縮して転送量を抑える。
			draco(),
			prune()
		);
		await io.write(level.outputPath, document);
		console.info(
			`[LOD] ${level.name} (${
				formatRatio(level.ratio)
			}, texture <= ${level.textureSize}px): ${level.outputPath}`
		);
	}

	return outputs;
};

const run = async () => {
	try {
		const options = parseLodArguments(process.argv.slice(2), process.cwd());
		if (!options) {
			console.info(USAGE);
			return;
		}
		await generateModelLods(options);
	} catch (error) {
		console.error(`[LOD] ${error instanceof Error ? error.message : String(error)}`);
		console.error(`\n${USAGE}`);
		process.exitCode = 1;
	}
};

const isMainModule = process.argv[1]
	&& path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
	void run();
}
