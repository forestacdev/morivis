const loadImage = (url: string): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous'; // この行を追加
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load image from ${url}`));
		img.src = url;
	});
};

// WebGLコンテキストの取得とキャンバス設定
const canvas = document.createElement('canvas');
canvas.width = 60;
canvas.height = 60;

// シェーダーコード
const vertexShaderSource = /* glsl */ `
    attribute vec4 a_position;
    void main() {
        gl_Position = a_position;
    }
`;

const fragmentShaderSource = /* glsl */ `
      #ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;

uniform sampler2D u_texture; // 画像テクスチャ

#define PI 3.14159265358979323846



// 円形マスク関数
float circleMask(vec2 _st, vec2 center, float radius) {
    return 1.0 - smoothstep(radius - 0.01, radius + 0.01, length(_st - center));
}

void main(void){
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    
    // テクスチャ座標
    vec2 texCoord = st;

    // 円形マスクの設定
    float radius = 0.4;
    float mask = circleMask(st, vec2(0.5, 0.5), radius);

    // 白い縁の設定
    float borderThickness = 0.02; // 縁の太さを指定
    float outerMask = circleMask(st, vec2(0.5, 0.5), radius - borderThickness);

    // テクスチャから色をサンプリング
    vec4 textureColor = texture2D(u_texture, texCoord);

    // 円形マスク適用
    vec3 color = textureColor.rgb;

    // 縁取り部分を白にする
    if (mask > 0.0 && outerMask < 1.0) {
        color = vec3(1.0); // 白い縁
    }

    // マスクの外側を透明にする
    float alpha = mask * textureColor.a;

    gl_FragColor = vec4(color, alpha);
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

export const imageToIcon = async (url: string): Promise<string> => {
	const image = await loadImage(url);
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

	// テクスチャの作成と読み込み
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// テクスチャのパラメータ設定
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.generateMipmap(gl.TEXTURE_2D);

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

	return outputCanvas.toDataURL('image/png');
};
