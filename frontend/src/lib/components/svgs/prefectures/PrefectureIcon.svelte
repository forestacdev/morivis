<script lang="ts">
	import hokkaido from './01.svelte';
	import aomori from './02.svelte';
	import iwate from './03.svelte';
	import miyagi from './04.svelte';
	import akita from './05.svelte';
	import yamagata from './06.svelte';
	import fukushima from './07.svelte';
	import ibaraki from './08.svelte';
	import tochigi from './09.svelte';
	import gunma from './10.svelte';
	import saitama from './11.svelte';
	import chiba from './12.svelte';
	import tokyo from './13.svelte';
	import kanagawa from './14.svelte';
	import niigata from './15.svelte';
	import toyama from './16.svelte';
	import ishikawa from './17.svelte';
	import fukui from './18.svelte';
	import yamanashi from './19.svelte';
	import nagano from './20.svelte';
	import gifu from './21.svelte';
	import shizuoka from './22.svelte';
	import aichi from './23.svelte';
	import mie from './24.svelte';
	import shiga from './25.svelte';
	import kyoto from './26.svelte';
	import osaka from './27.svelte';
	import hyogo from './28.svelte';
	import nara from './29.svelte';
	import wakayama from './30.svelte';
	import tottori from './31.svelte';
	import shimane from './32.svelte';
	import okayama from './33.svelte';
	import hiroshima from './34.svelte';
	import yamaguchi from './35.svelte';
	import tokushima from './36.svelte';
	import kagawa from './37.svelte';
	import ehime from './38.svelte';
	import kochi from './39.svelte';
	import fukuoka from './40.svelte';
	import saga from './41.svelte';
	import nagasaki from './42.svelte';
	import kumamoto from './43.svelte';
	import oita from './44.svelte';
	import miyazaki from './45.svelte';
	import kagoshima from './46.svelte';
	import okinawa from './47.svelte';

	import type { PrefectureCode } from '$routes/map/data/pref';

	export const components = {
		'01': hokkaido,
		'02': aomori,
		'03': iwate,
		'04': miyagi,
		'05': akita,
		'06': yamagata,
		'07': fukushima,
		'08': ibaraki,
		'09': tochigi,
		'10': gunma,
		'11': saitama,
		'12': chiba,
		'13': tokyo,
		'14': kanagawa,
		'15': niigata,
		'16': toyama,
		'17': ishikawa,
		'18': fukui,
		'19': yamanashi,
		'20': nagano,
		'21': gifu,
		'22': shizuoka,
		'23': aichi,
		'24': mie,
		'25': shiga,
		'26': kyoto,
		'27': osaka,
		'28': hyogo,
		'29': nara,
		'30': wakayama,
		'31': tottori,
		'32': shimane,
		'33': okayama,
		'34': hiroshima,
		'35': yamaguchi,
		'36': tokushima,
		'37': kagawa,
		'38': ehime,
		'39': kochi,
		'40': fukuoka,
		'41': saga,
		'42': nagasaki,
		'43': kumamoto,
		'44': oita,
		'45': miyazaki,
		'46': kagoshima,
		'47': okinawa
	};

	interface Props {
		code: PrefectureCode;
		width?: string;
	}

	let { code, width = '100px' }: Props = $props();

	let Component = $state(components[code] || null);
</script>

<Component {width} />
