import type { CadImportResult } from '../types';

/** 架空の10×20 mm平面。IGES 128の次数1のBスプライン曲面を最小構成で記述。 */
export const createTestIges = () => {
	const record = (text: string, section: string, index: number) =>
		text.padEnd(72) + section + String(index).padStart(7) + '\n';
	const globals =
		'1H,,1H;,4Htest,4Htest,4Htest,4Htest,32,38,6,308,15,4Htest,1.,2,2HMM,1,1.,15H20000101.000000,1.E-6,100.,4Htest,4Htest,11,0,15H20000101.000000;';
	const chunks = (value: string, width: number) =>
		value.match(new RegExp(`.{1,${width}}`, 'g')) ?? [];
	// K1,K2,M1,M2, five flags, knots U/V, weights, control points, U/V range.
	const parameters =
		'128,1,1,1,1,0,0,1,0,0,0.,0.,1.,1.,0.,0.,1.,1.,1.,1.,1.,1.,0.,0.,0.,10.,0.,0.,0.,20.,0.,10.,20.,0.,0.,1.,0.,1.;';
	const globalLines = chunks(globals, 72);
	const parameterLines = chunks(parameters, 64);
	const fields = (values: (number | string)[]) =>
		values.map(value => String(value).padStart(8)).join('');
	return record('test-surface', 'S', 1)
		+ globalLines.map((line, index) => record(line, 'G', index + 1)).join('')
		+ record(fields([128, 1, 0, 0, 0, 0, 0, 0, '00000000']), 'D', 1)
		+ record(fields([128, 0, 2, parameterLines.length, 0, 0, 0, 'test', 0]), 'D', 2)
		+ parameterLines.map((line, index) => record(line.padEnd(64) + '       1', 'P', index + 1))
			.join('')
		+ record(
			`S${String(1).padStart(7)}G${String(globalLines.length).padStart(7)}D${
				String(2).padStart(7)
			}P${String(parameterLines.length).padStart(7)}`,
			'T',
			1
		);
};

export const createTestCadResult = (): CadImportResult => ({
	success: true,
	root: {
		name: 'test-assembly',
		meshes: [],
		children: [
			{ name: 'test-part-a', meshes: [0], children: [] },
			{ name: 'test-part-b', meshes: [0], children: [] }
		]
	},
	meshes: [{
		name: 'test-surface',
		color: [0.5, 0.5, 0.5],
		attributes: { position: { array: [0, 0, 0, 2, 0, 0, 2, 3, 4, 0, 3, 4] } },
		index: { array: [0, 1, 2, 0, 2, 3] },
		brep_faces: [{ first: 1, last: 1, color: [1, 0, 0] }]
	}]
});
