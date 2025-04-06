// WebGLコンテキストの取得とキャンバス設定
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;

// シェーダーコード
const vertexShaderSource = `
    attribute vec4 a_position;
    void main() {
        gl_Position = a_position;
    }
`;

const fragmentShaderSource = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

float circle(in vec2 _st, in float _radius){
    vec2 l = _st-vec2(0.5);
    return 1.-smoothstep(_radius-(_radius*0.01),
                         _radius+(_radius*0.01),
                         dot(l,l)*4.0);
}

void main() {
	vec2 st = gl_FragCoord.xy/u_resolution;
    vec3 color = vec3(0.0);

    st *= 500.0;      // Scale up the space by 3
    st = fract(st); // Wrap around 1.0

    // Now we have 9 spaces that go from 0-1

    color = vec3(st,0.0);
    color = vec3(circle(st,0.5));

	gl_FragColor = vec4(color,1.0);
}
`;

const gl = canvas.getContext('webgl');
if (!gl) {
	console.error('WebGL not supported');
}

// シェーダーをコンパイルしてプログラムをリンク
const createShader = (
	gl: WebGLRenderingContext,
	type: number,
	source: string
): WebGLShader | null => {
	const shader = gl.createShader(type);
	if (!shader) return null;

	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
};

const createProgram = (
	gl: WebGLRenderingContext,
	vertexShader: WebGLShader,
	fragmentShader: WebGLShader
): WebGLProgram | null => {
	const program = gl.createProgram();
	if (!program) return null;

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('Program linking failed:', gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return null;
	}
	return program;
};

export const webglToPng = async (number: number): Promise<string> => {
	const gl = canvas.getContext('webgl');
	if (!gl) {
		console.error('WebGL not supported');
		return '';
	}

	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
	if (!vertexShader || !fragmentShader) return '';

	const program = createProgram(gl, vertexShader, fragmentShader);
	if (!program) return '';

	gl.useProgram(program);

	const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
	const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
	const numberLocation = gl.getUniformLocation(program, 'u_number');

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
		gl.STATIC_DRAW
	);

	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
	const floatNumber = parseFloat(String(number));
	gl.uniform1f(numberLocation, floatNumber);

	gl.drawArrays(gl.TRIANGLES, 0, 6);

	const outputCanvas = document.createElement('canvas');
	outputCanvas.width = canvas.width;
	outputCanvas.height = canvas.height;
	const outputContext = outputCanvas.getContext('2d');
	if (!outputContext) return '';

	const pixels = new Uint8Array(canvas.width * canvas.height * 4);
	gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

	const imageData = outputContext.createImageData(canvas.width, canvas.height);
	imageData.data.set(pixels);

	outputContext.putImageData(imageData, 0, 0);

	// bitmap形式で返す

	return outputCanvas.toDataURL('image/png');
};

// 画像をPNG形式でダウンロードする関数
const downloadImageBitmapAsPNG = (imageBitmap: ImageBitmap, filename: string) => {
	// 1. canvasに描画
	const canvas = document.createElement('canvas');
	canvas.width = imageBitmap.width;
	canvas.height = imageBitmap.height;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	ctx.drawImage(imageBitmap, 0, 0);

	// 2. PNGとしてBlob化して保存
	canvas.toBlob((blob) => {
		if (!blob) return;

		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();

		// クリーンアップ
		URL.revokeObjectURL(url);
	}, 'image/png');
};
