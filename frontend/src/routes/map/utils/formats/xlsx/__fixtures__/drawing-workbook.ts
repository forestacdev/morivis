import JSZip from 'jszip';

const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

export const drawingXml = (content: string) =>
	`<xdr:wsDr xmlns:xdr="${XDR}" xmlns:a="${A}">${content}</xdr:wsDr>`;
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
