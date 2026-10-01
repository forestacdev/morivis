import JSZip from 'jszip';

import {
	drawingChildren,
	type OfficeDrawingDocument,
	renderOfficeDrawing
} from '../office-drawing';
import {
	readEmbeddedImages,
	readPart,
	relationshipId,
	relationships
} from '../office-drawing/package';
import { child, children, parseXml } from '../xlsx/drawing-geometry';

export const readPptxDrawings = async (data: ArrayBuffer): Promise<OfficeDrawingDocument> => {
	const zip = await JSZip.loadAsync(data);
	const path = 'ppt/presentation.xml';
	const [xml, rels] = await Promise.all([
		readPart(zip, path),
		relationships(zip, path, '/slide')
	]);
	const slides = children(child(parseXml(xml), 'sldIdLst'), 'sldId');
	const items = slides.map((slide, index) => ({
		id: relationshipId(slide),
		name: `スライド ${index + 1}`
	}));
	return {
		items,
		readDrawing: async (id) => {
			const source = items.some((item) => item.id === id) && rels.get(id);
			if (!source) throw new Error('PowerPointのスライドが見つかりません');
			const root = parseXml(await readPart(zip, source));
			const tree = child(child(root, 'cSld'), 'spTree');
			if (!tree) throw new Error('PowerPointの図形一覧が見つかりません');
			// Follow the selected slide's layout/master, not an arbitrary theme1.xml.
			let themeXml: string | undefined;
			let current = source;
			for (let depth = 0; depth < 3; depth++) {
				const themes = await relationships(zip, current, '/theme');
				const theme = [...themes.values()][0];
				if (theme) {
					themeXml = await readPart(zip, theme);
					break;
				}
				const parents = await relationships(
					zip,
					current,
					depth === 0 ? '/slideLayout' : '/slideMaster'
				);
				const parent = [...parents.values()][0];
				if (!parent) break;
				current = parent;
			}
			const elements = drawingChildren(tree);
			const warnings = [
				'スライド上の図形を読み込みます。背景・マスター・表・グラフ・SmartArtは含みません。'
			];
			return renderOfficeDrawing(elements, {
				themeXml,
				images: await readEmbeddedImages(zip, source)
			}, warnings);
		}
	};
};
