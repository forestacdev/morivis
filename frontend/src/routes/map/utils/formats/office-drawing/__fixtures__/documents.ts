import JSZip from 'jszip';

export const ns =
	'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
export const shape = (color = '12AB34', x = 0) =>
	`<sp><nvSpPr><cNvPr id="1" name="test-shape"/></nvSpPr><spPr><a:xfrm><a:off x="${x}" y="0"/><a:ext cx="952500" cy="476250"/></a:xfrm><a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln w="9525"/></spPr><txBody><a:bodyPr/><a:p><a:r><a:rPr sz="1000"/><a:t>test-label</a:t></a:r></a:p></txBody></sp>`;
export const picture =
	`<pic><spPr><a:xfrm><a:off x="952500" y="0"/><a:ext cx="952500" cy="476250"/></a:xfrm></spPr><blipFill><a:blip r:embed="img"/></blipFill></pic>`;
export const image =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export const rels = (entries: [string, string, string, boolean?][]) =>
	`<Relationships>${
		entries.map(([id, target, type, external]) =>
			`<Relationship Id="${id}" Target="${target}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}"${
				external ? ' TargetMode="External"' : ''
			}/>`
		).join('')
	}</Relationships>`;

export const pptxFixture = async (
	options: { external?: boolean; missing?: boolean; empty?: boolean; } = {}
) => {
	const zip = new JSZip();
	zip.file(
		'ppt/presentation.xml',
		`<presentation ${ns}><sldIdLst><sldId id="256" r:id="second"/><sldId id="257" r:id="first"/></sldIdLst></presentation>`
	);
	zip.file(
		'ppt/_rels/presentation.xml.rels',
		rels([['first', 'slides/slide1.xml', 'slide'], [
			'second',
			'/ppt/slides/slide2.xml',
			'slide'
		]])
	);
	if (!options.missing) {
		zip.file(
			'ppt/slides/slide2.xml',
			`<sld ${ns}><cSld><spTree>${
				options.empty ? '' : shape() + picture
			}</spTree></cSld></sld>`
		);
	}
	zip.file(
		'ppt/slides/slide1.xml',
		`<sld ${ns}><cSld><spTree>${shape('AB1234')}</spTree></cSld></sld>`
	);
	zip.file(
		'ppt/slides/_rels/slide2.xml.rels',
		rels([[
			'img',
			options.external ? 'https://example.invalid/test.png' : '../media/test.png',
			'image',
			options.external
		], ['layout', '../slideLayouts/test.xml', 'slideLayout']])
	);
	zip.file(
		'ppt/slideLayouts/_rels/test.xml.rels',
		rels([['master', '../slideMasters/test.xml', 'slideMaster']])
	);
	zip.file(
		'ppt/slideMasters/_rels/test.xml.rels',
		rels([['theme', '../theme/test.xml', 'theme']])
	);
	zip.file(
		'ppt/theme/test.xml',
		'<theme><themeElements><fontScheme><minorFont><latin typeface="test-font"/></minorFont></fontScheme></themeElements></theme>'
	);
	zip.file('ppt/media/test.png', image, { base64: true });
	return zip.generateAsync({ type: 'arraybuffer' });
};

const wordShape =
	`<wsp><spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="476250"/></a:xfrm><a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="1234AB"/></a:solidFill><a:ln w="19050"/></spPr><txbx><w:txbxContent><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:b/><w:color w:val="AA0000"/></w:rPr><w:t>test-word</w:t></w:r></w:p></w:txbxContent></txbx><bodyPr/></wsp>`;
export const anchor = (content: string, x: number, z: number, extra = '') =>
	`<wp:anchor relativeHeight="${z}"><wp:positionH relativeFrom="column"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="952500" cy="476250"/><wp:docPr id="1" name="test-word-shape"/>${extra}<a:graphic><a:graphicData>${content}</a:graphicData></a:graphic></wp:anchor>`;

export const docxFixture = async (
	options: { missing?: boolean; aligned?: boolean; empty?: boolean; } = {}
) => {
	const zip = new JSZip();
	const foreground = anchor(wordShape, 0, 20);
	let xml =
		`<w:document ${ns} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><w:body><w:tbl><w:tr><w:tc><w:p><mc:AlternateContent><mc:Choice Requires="wps"><w:r><w:drawing>${foreground}</w:drawing></w:r></mc:Choice><mc:Fallback><w:r><w:drawing>${foreground}</w:drawing></w:r></mc:Fallback></mc:AlternateContent><w:r><w:drawing>${
			anchor(picture, 952500, 10)
		}</w:drawing></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:drawing>${
			anchor(wordShape, 0, 0)
		}</w:drawing></w:r></w:p><w:p><w:r><w:drawing><wp:inline><wp:extent cx="952500" cy="476250"/><a:graphic><a:graphicData>${picture}</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:body></w:document>`;
	if (options.aligned) {
		xml = xml.replaceAll('<wp:posOffset>0</wp:posOffset>', '<wp:align>center</wp:align>');
	}
	if (options.empty) xml = '<document><body><p/></body></document>';
	if (!options.missing) zip.file('word/document.xml', xml);
	zip.file('word/_rels/document.xml.rels', rels([['img', 'media/test.png', 'image']]));
	zip.file('word/media/test.png', image, { base64: true });
	return zip.generateAsync({ type: 'arraybuffer' });
};

export const groupedDrawing =
	`<drawing ${ns} xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><grpSp><grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1905000" cy="952500"/><a:chOff x="0" y="0"/><a:chExt cx="952500" cy="476250"/></a:xfrm></grpSpPr><mc:AlternateContent><mc:Choice Requires="a">${shape()}</mc:Choice><mc:Fallback>${shape()}</mc:Fallback></mc:AlternateContent></grpSp></drawing>`;
export const inheritedPlaceholder =
	'<drawing><sp><nvSpPr><nvPr><ph/></nvPr></nvSpPr><spPr/></sp></drawing>';
