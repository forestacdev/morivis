import JSZip from 'jszip';

const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

export const drawingXml = (content: string) =>
	`<xdr:wsDr xmlns:xdr="${XDR}" xmlns:a="${A}" xmlns:r="${R}">${content}</xdr:wsDr>`;
export const anchor = (content: string) =>
	`<xdr:absoluteAnchor><xdr:pos x="95250" y="190500"/><xdr:ext cx="381000" cy="190500"/>${content}</xdr:absoluteAnchor>`;
export const transform = (attributes = '') =>
	`<a:xfrm ${attributes}><a:off x="95250" y="190500"/><a:ext cx="381000" cy="190500"/></a:xfrm>`;
export const shape = (geometry: string, xfrm = transform()) =>
	`<xdr:sp><xdr:nvSpPr><xdr:cNvPr id="1" name="test-shape"/></xdr:nvSpPr><xdr:spPr>${xfrm}${geometry}</xdr:spPr><xdr:txBody><a:p><a:r><a:t>test-label</a:t></a:r></a:p></xdr:txBody></xdr:sp>`;
export const preset = (name = 'rect') => `<a:prstGeom prst="${name}"><a:avLst/></a:prstGeom>`;
export const custom = (commands: string) =>
	`<a:custGeom><a:pathLst><a:path w="100" h="100">${commands}</a:path></a:pathLst></a:custGeom>`;
export const point = (x: number, y: number) => `<a:pt x="${x}" y="${y}"/>`;
export const customTriangle = custom(
	`<a:moveTo>${point(0, 0)}</a:moveTo><a:lnTo>${point(100, 0)}</a:lnTo><a:lnTo>${
		point(100, 100)
	}</a:lnTo><a:close/>`
);

const rels = (content: string) =>
	`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${content}</Relationships>`;

/** Entirely synthetic workbook; relationship IDs deliberately differ from sheet IDs. */
export const drawingWorkbook = async (options: { missing?: boolean; external?: boolean; } = {}) => {
	const zip = new JSZip();
	zip.file(
		'xl/workbook.xml',
		`<workbook xmlns="${S}" xmlns:r="${R}"><sheets><sheet name="test-empty" sheetId="5" r:id="rId9"/><sheet name="test-drawing" sheetId="2" r:id="rId4"/></sheets></workbook>`
	);
	zip.file(
		'xl/_rels/workbook.xml.rels',
		rels(
			'<Relationship Id="rId9" Target="worksheets/empty.xml"/><Relationship Id="rId4" Target="/xl/worksheets/shapes.xml"/>'
		)
	);
	zip.file('xl/worksheets/empty.xml', `<worksheet xmlns="${S}"><sheetData/></worksheet>`);
	zip.file(
		'xl/worksheets/shapes.xml',
		`<worksheet xmlns="${S}" xmlns:r="${R}"><sheetData/><drawing r:id="rId7"/></worksheet>`
	);
	zip.file(
		'xl/worksheets/_rels/shapes.xml.rels',
		rels(
			`<Relationship Id="rId7" Target="../drawings/test.xml" ${
				options.external ? 'TargetMode="External"' : ''
			}/>`
		)
	);
	if (!options.missing) {
		zip.file('xl/drawings/test.xml', drawingXml(anchor(shape(customTriangle))));
	}
	return zip.generateAsync({ type: 'arraybuffer' });
};

export const anchoredSheetXml =
	`<worksheet xmlns="${S}"><sheetFormatPr defaultRowHeight="15" defaultColWidth="8.43"/><cols><col min="1" max="1" width="20"/></cols><sheetData><row r="1" ht="30"/></sheetData></worksheet>`;
export const cellAnchor = (twoCells: boolean) => {
	const tag = twoCells ? 'twoCellAnchor' : 'oneCellAnchor';
	const marker = (col: number, row: number) =>
		`<xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff>`;
	return `<xdr:${tag}><xdr:from>${marker(1, 1)}</xdr:from>${
		twoCells ? `<xdr:to>${marker(2, 2)}</xdr:to>` : '<xdr:ext cx="609600" cy="190500"/>'
	}${shape(preset(), '')}</xdr:${tag}>`;
};

// A synthetic 4 × 2 PNG: red on the left, blue on the right.
export const testPictureBase64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAFElEQVR4nGP4z8DwH4Sh1H8GdAEABykP8fcOk50AAAAASUVORK5CYII=';
export const pixelTransform = (x: number, y: number, width: number, height: number, attrs = '') =>
	`<a:xfrm ${attrs}><a:off x="${x * 9525}" y="${y * 9525}"/><a:ext cx="${width * 9525}" cy="${
		height * 9525
	}"/></a:xfrm>`;
export const picture = (crop = '', attrs = '') =>
	`<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="test-picture"/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="test-image"/><a:srcRect ${crop}/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr>${
		pixelTransform(220, 20, 160, 100, attrs)
	}${preset()}</xdr:spPr></xdr:pic>`;
export const testTheme =
	`<a:theme xmlns:a="${A}"><a:themeElements><a:clrScheme name="test"><a:accent1><a:srgbClr val="20C060"/></a:accent1></a:clrScheme><a:fontScheme name="test"><a:majorFont><a:latin typeface="sans-serif"/></a:majorFont><a:minorFont><a:latin typeface="sans-serif"/></a:minorFont></a:fontScheme><a:fmtScheme name="test"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
export const styledShape = () =>
	shape(
		preset()
			+ '<a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="D02040"/></a:solidFill></a:ln>',
		pixelTransform(20, 20, 160, 100)
	).replace('<a:p>', '<a:bodyPr anchor="ctr" wrap="none"/><a:p><a:pPr algn="ctr"/>')
		.replace(
			'<a:r>',
			'<a:r><a:rPr sz="1600" b="1"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:rPr>'
		);

export const appearanceWorkbook = async (
	options: {
		imageOnly?: boolean;
		externalImage?: boolean;
		missingImage?: boolean;
		unsafeImage?: boolean;
	} = {}
) => {
	const zip = await JSZip.loadAsync(await drawingWorkbook());
	const relPath = 'xl/_rels/workbook.xml.rels';
	zip.file(
		relPath,
		(await zip.file(relPath)!.async('string')).replace(
			'</Relationships>',
			`<Relationship Id="test-theme" Type="${R}/theme" Target="theme/test-theme.xml"/></Relationships>`
		)
	);
	zip.file('xl/theme/test-theme.xml', testTheme);
	zip.file(
		'xl/drawings/test.xml',
		drawingXml(anchor((options.imageOnly ? '' : styledShape()) + picture()))
	);
	zip.file(
		'xl/drawings/_rels/test.xml.rels',
		rels(
			`<Relationship Id="test-image" Type="${R}/image" Target="../media/test.png" ${
				options.externalImage ? 'TargetMode="External"' : ''
			}/>`
		)
	);
	if (!options.missingImage) {
		zip.file(
			'xl/media/test.png',
			options.unsafeImage
				? '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'
				: testPictureBase64,
			{ base64: !options.unsafeImage }
		);
	}
	return zip.generateAsync({ type: 'arraybuffer' });
};
