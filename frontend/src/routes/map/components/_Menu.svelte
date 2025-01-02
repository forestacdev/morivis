<script lang="ts">
	import Icon from '@iconify/svelte';
	import { indexOf } from 'es-toolkit/compat';
	import gsap from 'gsap';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { isSide } from '$map/store';
	import { mapStore } from '$map/store/map';

	const toggleMenu = (key) => {
		console.log('key:', key);
		if (key === $isSide) {
			isSide.set(null);
		} else {
			isSide.set(key);
		}
	};

	const matchExpression: DataDrivenPropertyValueSpecification<ColorSpecification> = [
		'match',
		['get', '樹種'],
		'スギ',
		'#FFB6C1',
		'ヒノキ',
		'#ADD8E6',
		'アカマツ',
		'#90EE90',
		'スラッシュマツ',
		'#FFD700',
		'広葉樹',
		'#D2691E',
		'草地',
		'#98FB98',
		'その他岩石',
		'#A9A9A9',
		'#FFFFFF' // デフォルトカラー
	];

	const interpolateExpression: DataDrivenPropertyValueSpecification<ColorSpecification> = [
		'case',
		['==', ['coalesce', ['get', '林齢'], -9999], -9999], // '林齢' が null または undefined の場合
		'#00000000', // -9999 に対応する色
		[
			'interpolate',
			['linear'],
			['coalesce', ['to-number', ['get', '林齢'], -9999], -9999], // '林齢' が数値でない場合に -9999 を使用
			0,
			'#eb0000',
			80,
			'#6e40e6'
		]
	];

	const caseExpression: DataDrivenPropertyValueSpecification<ColorSpecification> =
		// -9999 に対応する色（透明色）
		[
			'step',
			['coalesce', ['to-number', ['get', '面積'], -9999], -9999], // '林齢' が null や非数値の場合に -9999 を使用
			'#00000000', // デフォルトカラー（0 以下の場合の色）
			0,
			'#FF0000', // 0 の場合
			1,
			'#6e40e6' // 80 以上の場合の色
		];

	interface StyleColor {
		key: string;
		values: ExpressionColorData;
	}

	interface ExpressionColorData {
		[name: string]: {
			type: 'single' | 'match' | 'interpolate' | 'step';
			expression: DataDrivenPropertyValueSpecification<ColorSpecification>;
		};
	}

	interface Memory {
		type: 'single' | 'match' | 'interpolate' | 'step';
		mapping: Record<string | number, ColorSpecification> | null;
		default: ColorSpecification;
	}

	const expressionColorData: ExpressionColorData = {
		['単色']: {
			type: 'single',
			expression: '#FF0000'
		},
		['樹種']: {
			type: 'match',
			expression: matchExpression
		},
		['林齢']: {
			type: 'interpolate',
			expression: interpolateExpression
		},
		['面積']: {
			type: 'step',
			expression: caseExpression
		}
	};

	const styleColor: StyleColor = {
		key: '樹種',
		values: expressionColorData
	};

	onMount(() => {
		// 初期のMapbox式を受け取り、オブジェクト形式に変換する
		// isSide.set('base');
	});

	// Mapbox式からオブジェクトに変換
	const parseMatchExpression = (
		expression: DataDrivenPropertyValueSpecification<ColorSpecification>
	): Memory => {
		const mapping = {};
		for (let i = 2; i < expression.length - 1; i += 2) {
			mapping[expression[i]] = expression[i + 1];
		}
		// デフォルト値は別途保存
		const defaultValue = expression[expression.length - 1];
		return { mapping, default: defaultValue, type: 'match' };
	};
	const parseInterpolateExpression = (
		expression: DataDrivenPropertyValueSpecification<ColorSpecification>
	): Memory => {
		if (!Array.isArray(expression) || expression[0] !== 'case') {
			throw new Error('Invalid interpolateExpression format');
		}

		// デフォルト色を抽出
		const defaultColor = expression[2] as ColorSpecification;

		// マッピングデータを抽出
		const interpolate = expression[3] as Array<any>;
		if (!Array.isArray(interpolate) || interpolate[0] !== 'interpolate') {
			throw new Error('Invalid interpolate expression format');
		}

		const stops = interpolate.slice(3); // 停止点以降を取得
		const mapping: Record<string | number, ColorSpecification> = {};

		for (let i = 0; i < stops.length; i += 2) {
			const key = stops[i];
			const value = stops[i + 1];
			mapping[key] = value;
		}

		return {
			type: 'interpolate',
			mapping,
			default: defaultColor
		};
	};

	const parseStepExpression = (
		expression: DataDrivenPropertyValueSpecification<ColorSpecification>
	): Memory => {
		if (!Array.isArray(expression) || expression[0] !== 'step') {
			throw new Error('Invalid caseExpression format');
		}

		// デフォルトカラーを抽出
		const defaultColor = expression[2] as ColorSpecification;

		// マッピングデータを抽出
		const stops = expression.slice(3); // 停止点以降を取得
		const mapping: Record<string | number, ColorSpecification> = {};

		for (let i = 0; i < stops.length; i += 2) {
			const key = stops[i];
			const value = stops[i + 1];
			mapping[key] = value;
		}

		return {
			type: 'step',
			mapping,
			default: defaultColor
		};
	};

	// オブジェクトからMapbox式を生成
	const generateMatchExpression = (memory: Memory) => {
		const expression = ['match', ['get', '樹種']];
		if (!memory.mapping) return;
		for (const [key, value] of Object.entries(memory.mapping)) {
			expression.push(key, value);
		}
		expression.push(memory.default); // デフォルト値を最後に追加
		return expression;
	};
	const generateInterpolateExpression = (
		memory: Memory
	): DataDrivenPropertyValueSpecification<ColorSpecification> => {
		const { mapping, default: defaultColor } = memory;
		if (!mapping) return;

		// マッピングデータから `interpolate` 部分を作成
		const interpolate = [
			'interpolate',
			['linear'],
			['coalesce', ['to-number', ['get', '林齢'], -9999], -9999]
		];

		// マッピングを順序通りに追加
		for (const key of Object.keys(mapping).sort((a, b) => +a - +b)) {
			interpolate.push(+key, mapping[key]);
		}

		// `case` 式を構築
		return ['case', ['==', ['coalesce', ['get', '林齢'], -9999], -9999], defaultColor, interpolate];
	};

	const generateStepExpression = (
		memory: Memory
	): DataDrivenPropertyValueSpecification<ColorSpecification> => {
		const { mapping, default: defaultColor } = memory;
		if (!mapping) return;

		// マッピングデータを元に `case` 式を構築
		const expression = [
			'step',
			['coalesce', ['to-number', ['get', '面積'], -9999], -9999],
			defaultColor
		];

		for (const [key, value] of Object.entries(mapping)) {
			expression.push(+key, value);
		}

		return expression;
	};

	const parseExpression = (data: ExpressionColorData[string]): Memory => {
		if (data.type === 'single') {
			console.log('data:', data);
			return { mapping: null, default: data.expression, type: 'single' };
		} else if (data.type === 'match') {
			return parseMatchExpression(data.expression);
		} else if (data.type === 'interpolate') {
			return parseInterpolateExpression(data.expression);
		} else if (data.type === 'step') {
			return parseStepExpression(data.expression);
		}
	};

	// 初期データをオブジェクト形式に変換して格納
	let stateData = $state(styleColor);

	let total: Memory = $state(parseExpression(stateData.values[stateData.key]));

	$effect(() => {
		let updatedExpression;
		if (total.type === 'single') {
			updatedExpression = total.default;
		} else if (total.type === 'match') {
			updatedExpression = generateMatchExpression(total);
		} else if (total.type === 'interpolate') {
			updatedExpression = generateInterpolateExpression(total);
		} else if (total.type === 'step') {
			updatedExpression = generateStepExpression(total);
		}
		// Mapbox GL JS のレイヤー設定を更新
		const map = mapStore.getMap();
		if (map && map.getLayer('ENSYURIN_rinhanzu') && updatedExpression) {
			map.setPaintProperty('ENSYURIN_rinhanzu', 'fill-color', updatedExpression);
		}
	});

	$effect(() => {
		const currentTotal = parseExpression(stateData.values[stateData.key]);
		total = currentTotal;
	});
</script>

<div class="bg-main absolute z-10 w-[200px] p-2">
	<select class="w-full bg-gray-200 p-2 text-left" bind:value={stateData.key}>
		{#each Object.keys(stateData.values) as key}
			<option value={key}>{key}</option>
		{/each}
	</select>
	{JSON.stringify(total)}
	{#if total}
		<div class="bg-main absolute z-10 w-[200px] p-2">
			<div class="bg-white p-2">
				<!-- オブジェクト形式のデータをループ -->
				{#if total.type === 'single'}
					<div class="mb-2 flex items-center justify-between">
						<span>色</span>
						<input type="color" bind:value={total.default} />
					</div>
				{:else if total.mapping}
					{#each Object.entries(total.mapping) as [key, value]}
						<div class="mb-2 flex items-center justify-between">
							<span>{key}</span>
							<input type="color" bind:value={total.mapping[key]} />
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- <button class="w-full bg-gray-200 p-2 text-left" on:click={() => toggleMenu('base')}>
		<Icon icon="ic:round-menu" /></button
	> -->
<style>
</style>
