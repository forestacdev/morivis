import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsRoot = path.resolve(__dirname, '../docs');
const host = '127.0.0.1';
const port = 4175;

const mimeTypes = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.mmd': 'text/plain; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml; charset=utf-8'
};

const sendText = (response, statusCode, message) => {
	response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
	response.end(message);
};

const resolveFilePath = async (pathname) => {
	const decodedPath = decodeURIComponent(pathname);
	const normalizedPath = path.posix.normalize(decodedPath);
	const relativePath = normalizedPath === '/' ? 'index.html' : normalizedPath.replace(/^\/+/, '');
	const absolutePath = path.resolve(docsRoot, relativePath);

	if (!absolutePath.startsWith(docsRoot)) {
		return null;
	}

	try {
		const fileStat = await stat(absolutePath);
		if (fileStat.isDirectory()) {
			return path.join(absolutePath, 'index.html');
		}

		return absolutePath;
	} catch {
		return absolutePath;
	}
};

await access(docsRoot);

const server = createServer(async (request, response) => {
	const requestUrl = new URL(request.url ?? '/', `http://${host}:${port}`);
	const filePath = await resolveFilePath(requestUrl.pathname);

	if (!filePath) {
		sendText(response, 403, 'Forbidden');
		return;
	}

	try {
		const fileStat = await stat(filePath);
		if (!fileStat.isFile()) {
			sendText(response, 404, 'Not Found');
			return;
		}

		const extension = path.extname(filePath);
		response.writeHead(200, {
			'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
			'Cache-Control': 'no-cache'
		});
		createReadStream(filePath).pipe(response);
	} catch {
		sendText(response, 404, 'Not Found');
	}
});

server.listen(port, host, () => {
	process.stdout.write(`Serving frontend/docs at http://${host}:${port}\n`);
});
