export const imageToflatArray = async (imageUrl: string) => {
	const img = new Image();
	img.crossOrigin = 'Anonymous';
	img.src = imageUrl;

	await new Promise((resolve) => {
		img.onload = resolve;
	});

	const canvas = document.createElement('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	ctx.drawImage(img, 0, 0);

	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	return imageData.data;
};

// WebGLコンテキストの取得とキャンバス設定
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;

export const webglToPng = async (number: number) => {
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

// Copyright (c) Patricio Gonzalez Vivo, 2015 - http://patriciogonzalezvivo.com/
// I am the sole copyright owner of this Work.
//
// You cannot host, display, distribute or share this Work in any form,
// including physical and digital. You cannot use this Work in any
// commercial or non-commercial product, website or project. You cannot
// sell this Work and you cannot mint an NFTs of it.
// I share this Work for educational purposes, and you can link to it,
// through an URL, proper attribution and unmodified screenshot, as part
// of your educational material. If these conditions are too restrictive
// please contact me and we'll definitely work it out.

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_number;

#define PI 3.14159265358979323846

vec2 rotate2D(vec2 _st, float _angle){
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}

vec2 tile(vec2 _st, float _zoom){
    _st *= _zoom;
    return fract(_st);
}

float box(vec2 _st, vec2 _size, float _smoothEdges){
    _size = vec2(0.5)-_size*0.5;
    vec2 aa = vec2(_smoothEdges*0.5);
    vec2 uv = smoothstep(_size,_size+aa,_st);
    uv *= smoothstep(_size,_size+aa,vec2(1.0)-_st);
    return uv.x*uv.y;
}

void main(void){
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    vec3 color = vec3(0.0);

    // Divide the space in 4
    st = tile(st,u_number - 2.0);

    // Use a matrix to rotate the space 45 degrees
    st = rotate2D(st,PI*0.25);

    // Draw a square
    color = vec3(box(st,vec2(0.7),0.01));
    // color = vec3(st,0.0);

    gl_FragColor = vec4(color,1.0);
}
`;

	// document.body.appendChild(canvas);

	const gl = canvas.getContext('webgl');
	if (!gl) {
		console.error('WebGL not supported');
	}

	// シェーダーをコンパイルしてプログラムをリンク
	function createShader(gl, type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}

	function createProgram(gl, vertexShader, fragmentShader) {
		const program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('Program linking failed:', gl.getProgramInfoLog(program));
			gl.deleteProgram(program);
			return null;
		}
		return program;
	}

	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
	const program = createProgram(gl, vertexShader, fragmentShader);

	gl.useProgram(program);

	// シェーダーの属性とユニフォームの設定
	const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
	const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
	const numberLocation = gl.getUniformLocation(program, 'u_number');

	// スクリーン全体をカバーする四角形を描画
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
		gl.STATIC_DRAW
	);

	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	// 解像度を設定
	gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
	const floatNumber = parseFloat(number);
	// 数値を設定
	gl.uniform1f(numberLocation, floatNumber);

	// 描画
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	// WebGLの内容をコピーするためのCanvasを作成
	const outputCanvas = document.createElement('canvas');
	outputCanvas.width = canvas.width;
	outputCanvas.height = canvas.height;
	const outputContext = outputCanvas.getContext('2d');

	// WebGLからピクセルデータを取得
	const pixels = new Uint8Array(canvas.width * canvas.height * 4);
	gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

	// ImageDataオブジェクトにピクセルデータを格納
	const imageData = outputContext.createImageData(canvas.width, canvas.height);
	imageData.data.set(pixels);

	// ImageDataをCanvasに描画
	outputContext.putImageData(imageData, 0, 0);

	// PNG形式で保存するためのデータURLを生成
	const pngDataUrl = outputCanvas.toDataURL('image/png');

	return pngDataUrl;
};
