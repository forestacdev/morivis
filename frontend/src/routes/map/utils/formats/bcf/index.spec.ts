import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { BcfParseError, parseBcfArchive } from './index';

const createTestArchive = async () => {
	const zip = new JSZip();
	zip.file('bcf.version', '<Version VersionId="3.0" />');
	zip.file(
		'test-topic/markup.bcf',
		`<?xml version="1.0" encoding="UTF-8"?>
		<Markup>
			<Topic Guid="test-topic-guid" Title="確認事項" TopicStatus="Open" TopicType="Information">
				<Description>架空の確認内容です</Description>
				<Comments>
					<Comment Guid="test-comment-guid" Author="test-user" Date="2026-01-01T00:00:00Z">
						<Comment>確認してください</Comment>
					</Comment>
				</Comments>
				<Viewpoints>
					<ViewPoint Guid="test-viewpoint-guid">
						<Viewpoint>test-viewpoint.bcfv</Viewpoint>
						<Snapshot>test-snapshot.png</Snapshot>
					</ViewPoint>
				</Viewpoints>
			</Topic>
		</Markup>`
	);
	zip.file(
		'test-topic/test-viewpoint.bcfv',
		`<VisualizationInfo Guid="test-viewpoint-guid">
			<Components>
				<Selection><Component IfcGuid="test-ifc-guid" /></Selection>
				<Visibility><Exceptions><Component IfcGuid="test-context-ifc-guid" /></Exceptions></Visibility>
			</Components>
			<OrthogonalCamera>
				<CameraViewPoint><X>10</X><Y>20</Y><Z>30</Z></CameraViewPoint>
				<CameraDirection><X>0</X><Y>1</Y><Z>0</Z></CameraDirection>
				<CameraUpVector><X>0</X><Y>0</Y><Z>1</Z></CameraUpVector>
				<ViewToWorldScale>40</ViewToWorldScale>
			</OrthogonalCamera>
		</VisualizationInfo>`
	);
	zip.file('test-topic/test-snapshot.png', new Uint8Array([137, 80, 78, 71]));
	return zip.generateAsync({ type: 'arraybuffer' });
};

describe('parseBcfArchive', () => {
	it('BCF 3.0のトピック、コメント、IFC GUIDを解析する', async () => {
		const document = await parseBcfArchive(await createTestArchive());

		expect(document).toMatchObject({
			version: '3.0',
			topics: [
				{
					guid: 'test-topic-guid',
					title: '確認事項',
					status: 'Open',
					type: 'Information',
					selectionIfcGuids: ['test-ifc-guid'],
					visibilityExceptionIfcGuids: ['test-context-ifc-guid'],
					viewpoints: [
						{
							guid: 'test-viewpoint-guid',
							camera: {
								type: 'orthographic',
								position: [10, 20, 30],
								direction: [0, 1, 0],
								up: [0, 0, 1],
								viewToWorldScale: 40
							},
							selectionIfcGuids: ['test-ifc-guid'],
							visibilityExceptionIfcGuids: ['test-context-ifc-guid']
						}
					],
					comments: [
						{
							guid: 'test-comment-guid',
							author: 'test-user',
							text: '確認してください'
						}
					]
				}
			]
		});
		expect(document.topics[0].viewpoints[0].snapshot).toBeInstanceOf(Blob);
	});

	it('markup.bcfを持たないZIPを拒否する', async () => {
		const zip = new JSZip();
		zip.file('bcf.version', '<Version VersionId="3.0" />');

		await expect(
			parseBcfArchive(await zip.generateAsync({ type: 'arraybuffer' }))
		).rejects.toBeInstanceOf(BcfParseError);
	});
});
