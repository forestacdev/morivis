import chroma from 'chroma-js';

const brewerColorPallet = {
	// sequential:singleHue
	Blues: chroma.brewer.Blues.slice(0, 9),
	Greens: chroma.brewer.Greens.slice(0, 9),
	Greys: chroma.brewer.Greys.slice(0, 9),
	Oranges: chroma.brewer.Oranges.slice(0, 9),
	Purples: chroma.brewer.Purples.slice(0, 9),
	Reds: chroma.brewer.Reds.slice(0, 9),

	// sequential:multiHue
	BuGn: chroma.brewer.BuGn.slice(0, 9),
	BuPu: chroma.brewer.BuPu.slice(0, 9),
	GnBu: chroma.brewer.GnBu.slice(0, 9),
	OrRd: chroma.brewer.OrRd.slice(0, 9),
	PuBu: chroma.brewer.PuBu.slice(0, 9),
	PuBuGn: chroma.brewer.PuBuGn.slice(0, 9),
	PuRd: chroma.brewer.PuRd.slice(0, 9),
	RdPu: chroma.brewer.RdPu.slice(0, 9),
	YlGn: chroma.brewer.YlGn.slice(0, 9),
	YlGnBu: chroma.brewer.YlGnBu.slice(0, 9),
	YlOrBr: chroma.brewer.YlOrBr.slice(0, 9),
	YlOrRd: chroma.brewer.YlOrRd.slice(0, 9),

	// diverging
	BrBG: chroma.brewer.BrBG.slice(0, 11),
	PiYG: chroma.brewer.PiYG.slice(0, 11),
	PRGn: chroma.brewer.PRGn.slice(0, 11),
	PuOr: chroma.brewer.PuOr.slice(0, 11),
	RdBu: chroma.brewer.RdBu.slice(0, 11),
	RdGy: chroma.brewer.RdGy.slice(0, 11),
	RdYlBu: chroma.brewer.RdYlBu.slice(0, 11),
	RdYlGn: chroma.brewer.RdYlGn.slice(0, 11),
	Spectral: chroma.brewer.Spectral.slice(0, 11),

	// qualitative
	Accent: chroma.brewer.Accent,
	Dark2: chroma.brewer.Dark2,
	Paired: chroma.brewer.Paired,
	Pastel1: chroma.brewer.Pastel1,
	Pastel2: chroma.brewer.Pastel2,
	Set1: chroma.brewer.Set1,
	Set2: chroma.brewer.Set2,
	Set3: chroma.brewer.Set3
} as const;

type BrewerColorPallet = typeof brewerColorPallet;
type BrewerColorPalletKeys = keyof BrewerColorPallet;

const colorPaletteMaxColors = Object.fromEntries(
	Object.entries(brewerColorPallet).map(([name, colors]) => [name, colors.length])
) as Record<keyof typeof brewerColorPallet, number>;

const sequentialSingleHue = ['Blues', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds'];
const sequentialMultiHue = [
	'BuGn',
	'BuPu',
	'GnBu',
	'OrRd',
	'PuBu',
	'PuBuGn',
	'PuRd',
	'RdPu',
	'YlGn',
	'YlGnBu',
	'YlOrBr',
	'YlOrRd'
];
const colorPalletCount = {
	sequential: { '9': [...sequentialSingleHue, ...sequentialMultiHue] },
	diverging: {
		'11': ['BrBG', 'PiYG', 'PRGn', 'PuOr', 'RdBu', 'RdGy', 'RdYlBu', 'RdYlGn', 'Spectral']
	},
	qualitative: {
		'8': ['Accent', 'Dark2', 'Paired', 'Pastel1', 'Pastel2', 'Set1', 'Set2', 'Set3'],
		'9': ['Paired', 'Pastel1', 'Set1', 'Set3'],
		'12': ['Accent', 'Dark2']
	}
} as const;
