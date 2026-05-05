import type { SpritePatternId } from '$routes/map/data/types/vector/pattern';

export type MatchPatternDict = Record<string, SpritePatternId>;

const treeSpeciesPatternDict: MatchPatternDict = {
	針広混交林: 'tmpoly-line-vertical-down-light-200-black',
	新植地: 'tmpoly-line-vertical-down-light-200-black',
	伐採跡地: 'tmpoly-line-vertical-down-light-200-black',
	その他: 'tmpoly-line-vertical-down-light-200-black'
};

export const matchPatternDicts = {
	treeSpecies: treeSpeciesPatternDict
} as const satisfies Record<string, MatchPatternDict>;

export type MatchPatternDictName = keyof typeof matchPatternDicts;
