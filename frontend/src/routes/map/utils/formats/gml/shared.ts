export const getChildElements = (parent: Element) => {
	return Array.from(parent.childNodes).filter((child): child is Element => child.nodeType === 1);
};

export const parseXmlDocument = async (text: string): Promise<Document> => {
	if (typeof DOMParser !== 'undefined') {
		return new DOMParser().parseFromString(text, 'text/xml');
	}

	const { DOMParser: XmldomParser } = await import('@xmldom/xmldom');
	return new XmldomParser().parseFromString(text, 'text/xml') as unknown as Document;
};

export const getParserErrorText = (doc: Document) => {
	const parserError = doc.getElementsByTagName('parsererror')[0];
	return parserError?.textContent?.trim();
};
