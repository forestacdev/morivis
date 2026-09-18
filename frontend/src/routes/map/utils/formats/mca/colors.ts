/** テクスチャを同梱せず、ブロック名に基づく代表色で表示する。 */
const DYES: Record<string, number> = {
	white: 0xe5e5df,
	orange: 0xdb7626,
	magenta: 0xac4fb5,
	light_blue: 0x61afd0,
	yellow: 0xe7c535,
	lime: 0x80bd32,
	pink: 0xd987a2,
	gray: 0x474d51,
	light_gray: 0x92938b,
	cyan: 0x268c95,
	purple: 0x7b3da8,
	blue: 0x374fa5,
	brown: 0x765037,
	green: 0x587434,
	red: 0xb43b34,
	black: 0x25272c
};

export const blockColor = (name: string): number => {
	const block = name.replace(/^minecraft:/, '');
	for (const [dye, color] of Object.entries(DYES)) {
		if (block.startsWith(`${dye}_`)) return color;
	}
	if (/water|bubble_column/.test(block)) return 0x3f76c4;
	if (/lava|magma/.test(block)) return 0xe76821;
	if (/snow|quartz|calcite|diorite/.test(block)) return 0xdfdfd6;
	if (/ice|glass/.test(block)) return 0x9bcbd5;
	if (/grass|moss|leaves|fern|vine|cactus|bamboo/.test(block)) return 0x658d42;
	if (/dirt|mud|farmland|soul_sand/.test(block)) return 0x846044;
	if (/sand|end_stone|birch/.test(block)) return 0xd6ca91;
	if (/netherrack|nether_brick|crimson/.test(block)) return 0x803d3b;
	if (/warped|prismarine/.test(block)) return 0x438e82;
	if (/deepslate|basalt|blackstone|coal/.test(block)) return 0x49494e;
	if (/obsidian/.test(block)) return 0x30253f;
	if (/diamond/.test(block)) return 0x58c8bd;
	if (/emerald/.test(block)) return 0x42ad61;
	if (/gold/.test(block)) return 0xd7b537;
	if (/copper/.test(block)) return 0xb77955;
	if (/iron/.test(block)) return 0xb0a89c;
	if (/redstone/.test(block)) return 0xa43329;
	if (/lapis/.test(block)) return 0x3e5ca0;
	if (/granite|terracotta|brick/.test(block)) return 0xa16e59;
	if (/stone|gravel|andesite|tuff/.test(block)) return 0x858582;
	if (/log|wood|stem/.test(block)) return 0x705439;
	if (/planks|fence|door|chest|crafting|bookshelf/.test(block)) return 0xa38350;
	// 未知・MOD由来のブロックも落とさず、名前から一定の色を割り当てる。
	let hash = 0;
	for (const char of name) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
	return ((96 + (hash & 95)) << 16) | ((96 + ((hash >>> 8) & 95)) << 8)
		| (96 + ((hash >>> 16) & 95));
};

export const linearColor = (color: number): [number, number, number, number] => {
	const linear = (byte: number) => {
		const value = byte / 255;
		return Math.round(
			255 * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
		);
	};
	return [linear(color >>> 16), linear((color >>> 8) & 255), linear(color & 255), 255];
};
