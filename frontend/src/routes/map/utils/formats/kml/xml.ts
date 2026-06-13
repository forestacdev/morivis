export const parseXmlDocument = async (text: string): Promise<Document> => {
	if (typeof DOMParser !== 'undefined') {
		return new DOMParser().parseFromString(text, 'text/xml');
	}

	const { DOMParser: XmldomParser } = await import('@xmldom/xmldom');
	return new XmldomParser().parseFromString(text, 'text/xml') as unknown as Document;
};

export const getFirstChildText = (parent: Element, namespace: string, tagName: string) => {
	return parent.getElementsByTagNameNS(namespace, tagName)[0]?.textContent?.trim();
};

export const getDirectChildText = (parent: Element, namespace: string, tagName: string) => {
	for (const child of Array.from(parent.children)) {
		if (child.namespaceURI === namespace && child.localName === tagName) {
			return child.textContent?.trim();
		}
	}
};

export const getDirectChildElement = (parent: Element, namespace: string, tagName: string) => {
	for (const child of Array.from(parent.children)) {
		if (child.namespaceURI === namespace && child.localName === tagName) {
			return child;
		}
	}
};
