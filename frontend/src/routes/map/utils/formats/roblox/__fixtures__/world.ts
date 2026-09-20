/** 実在のワールドに依存しない、手作りのXML。 */
export const partXml = (properties = '', nested = '', className = 'Part') => `
<Item class="${className}" referent="test-part">
 <Properties><string name="Name">test-part</string>${properties}</Properties>${nested}
</Item>`;
export const worldXml = (items: string, outside = '') => `
<roblox version="4"><Item class="Workspace" referent="test-workspace"><Properties/>${items}</Item>${outside}</roblox>`;
export const sizeXml = (x = 2, y = 4, z = 6) =>
	`<Vector3 name="size"><X>${x}</X><Y>${y}</Y><Z>${z}</Z></Vector3>`;
export const frameXml = (x = 10, y = 4, z = -8, rotation = [1, 0, 0, 0, 1, 0, 0, 0, 1]) => `
<CoordinateFrame name="CFrame"><X>${x}</X><Y>${y}</Y><Z>${z}</Z>${
	rotation.map((value, i) =>
		`<R${Math.floor(i / 3)}${i % 3}>${value}</R${Math.floor(i / 3)}${i % 3}>`
	).join('')
}</CoordinateFrame>`;
export const testWorld = worldXml(
	partXml(sizeXml() + frameXml() + '<Color3uint8 name="Color3uint8">4294901760</Color3uint8>')
);
