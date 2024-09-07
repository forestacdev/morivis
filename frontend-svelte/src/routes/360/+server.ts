import { test } from '@playwright/test';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { id, geometryBearing } = await request.json();

		const angleX = geometryBearing.x;
		const angleY = geometryBearing.y;
		const angleZ = geometryBearing.z;

		// JSONファイルのパスを指定
		const filePath = path.join(process.cwd(), 'src', 'lib', 'json', 'angle.json');

		// ファイルを読み込む
		const fileContent = await fs.readFile(filePath, 'utf-8');
		let jsonData = JSON.parse(fileContent);

		// データを更新
		jsonData = jsonData.map((item) => {
			console.log(item.id, id);
			if (item.id === id) {
				return { ...item, angleX, angleY, angleZ };
			}
			return item;
		});

		// 更新したデータをファイルに書き込む
		await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));

		return new Response(JSON.stringify({ success: true, updatedData: jsonData }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error updating JSON:', error);
		return new Response(JSON.stringify({ success: false, error: 'Failed to update JSON' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

export const GET: RequestHandler = async ({ request }) => {
	// test テキストを返す
	return new Response('test', {
		headers: { 'Content-Type': 'text/plain' }
	});
};
