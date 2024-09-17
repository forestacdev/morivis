const loadImage = async (src: string): Promise<ImageBitmap> => {
	const response = await fetch(src);
	if (!response.ok) {
		throw new Error('Failed to fetch image');
	}
	const blob = await response.blob();
	return await createImageBitmap(blob);
};

const vsSource = `#version 300 es
    in vec4 aPosition;
    out vec2 vTexCoord;

    void main() {
        gl_Position = aPosition;
        vTexCoord = vec2(aPosition.x * 0.5 + 0.5, aPosition.y * -0.5 + 0.5); // Y軸を反転
    }
`;

const fsSource = `#version 300 es
    precision mediump float;
    uniform sampler2D heightMap;
    in vec2 vTexCoord;
    out vec4 fragColor;

       // 高さ変換関数
    float convertToHeight(vec4 color) {
        float r = color.r * 255.0;
        float g = color.g * 255.0;
        float b = color.b * 255.0;

        float rgb = (r * 65536.0) + (g * 256.0) + b;
        float h = 0.0;
        if (rgb < 8388608.0) {
            h = rgb * 0.01;
        } else if (rgb > 8388608.0) {
            h = (rgb - 16777216.0) * 0.01;
        }
        return h;
    }

    // 高さに基づいて色を決定する関数
    vec3 heightToColor(float height) {
        float interval = 500.0; // 500mごとに色を変える
        float normalizedHeight = mod(height, interval) / interval;
        
        // 色のグラデーションを定義
        vec3 color1 = vec3(0.2, 0.8, 0.2); // 緑
        vec3 color2 = vec3(0.8, 0.7, 0.2); // 黄土色
        vec3 color3 = vec3(0.6, 0.3, 0.1); // 茶色
        vec3 color4 = vec3(0.8, 0.8, 0.8); // 灰色
        
        if (normalizedHeight < 0.25) {
            return mix(color1, color2, normalizedHeight * 4.0);
        } else if (normalizedHeight < 0.5) {
            return mix(color2, color3, (normalizedHeight - 0.25) * 4.0);
        } else if (normalizedHeight < 0.75) {
            return mix(color3, color4, (normalizedHeight - 0.5) * 4.0);
        } else {
            return mix(color4, color1, (normalizedHeight - 0.75) * 4.0);
        }
    }

   
    // void main() {
    //     vec2 uv = vTexCoord;
    //     vec4 color = texture(heightMap, uv);

    //    float height = convertToHeight(color);

    // // 高さに基づいて色を決定
    // vec3 terrainColor = heightToColor(height);

    // // フラグメントカラー
    // fragColor = vec4(terrainColor, 1.0);

    // }

    // エッジ検出のためのカーネル
    const mat3 edgeKernel = mat3(
        -1.0, -1.0, -1.0,
        -1.0,  4.0, -1.0,
        -1.0, -1.0, -1.0
    );

    // 色の量子化
    vec3 quantizeColor(vec3 color, float levels) {
        return floor(color * levels) / levels;
    }


    void main() {
        vec2 uv = vTexCoord;
    //     vec4 color = texture(heightMap, uv);


    // // グレースケール値を計算（輝度）
    // float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // // 白が0、黒が1になるように反転
    // float invertedLuminance = 1.0 - luminance;
    
    

    // float alphaThreshold = 0.8; // 閾値
    // float alphaSmoothness = 0.1; // スムージング
    // float alphaMin = 0.0; // 最小アルファ値
    // float alphaMax = 1.0; // 最大アルファ

    //   // 透明度を調整
    // float alpha = smoothstep(alphaThreshold - alphaSmoothness, alphaThreshold + alphaSmoothness, invertedLuminance);
    // alpha = mix(alphaMin, alphaMax, alpha);
    
    // // 最終的な色を設定（RGBは固定値、アルファ値を調整）
    // fragColor = vec4(vec3(0.1, 0.2,0.2), alpha);

    vec2 texelSize = 1.0 / vec2(256.0);
    vec3 sampleColor = texture(heightMap, vTexCoord).rgb;
    
    // エッジ検出
    float edge = 0.0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            vec2 offset = vec2(float(i), float(j)) * texelSize;
            vec3 neighborColor = texture(heightMap, vTexCoord + offset).rgb;
            edge += dot(neighborColor, vec3(edgeKernel[i+1][j+1]));
        }
    }
    
    // 色の量子化
    vec3 quantizedColor = quantizeColor(sampleColor, 5.0);
    
    // エッジと量子化した色を組み合わせる
    vec3 finalColor = mix(quantizedColor, vec3(0.0), smoothstep(0.2, 0.8, edge));
    
    // 彩度を上げる
    vec3 grayScale = vec3(dot(finalColor, vec3(0.299, 0.587, 0.114)));
    finalColor = mix(grayScale, finalColor, 1.5);
    
    fragColor = vec4(finalColor, 1.0);

    }
`;

let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let heightMapLocation: WebGLUniformLocation | null = null;

const initWebGL = (canvas: OffscreenCanvas) => {
	gl = canvas.getContext('webgl2');
	if (!gl) {
		throw new Error('WebGL not supported');
	}

	const loadShader = (
		gl: WebGL2RenderingContext,
		type: number,
		source: string
	): WebGLShader | null => {
		const shader = gl.createShader(type);
		if (!shader) {
			console.error('Unable to create shader');
			return null;
		}
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(
				'An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader)
			);
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	};

	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
	if (!vertexShader || !fragmentShader) {
		throw new Error('Failed to load shaders');
	}

	program = gl.createProgram();
	if (!program) {
		throw new Error('Failed to create program');
	}
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
		throw new Error('Failed to link program');
	}

	gl.useProgram(program);

	positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
	const positionLocation = gl.getAttribLocation(program, 'aPosition');
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

	heightMapLocation = gl.getUniformLocation(program, 'heightMap');
};

const canvas = new OffscreenCanvas(256, 256);

self.onmessage = async (e) => {
	const { url } = e.data;

	try {
		const image = await loadImage(url);

		if (!gl) {
			initWebGL(canvas);
		}

		if (!gl || !program || !positionBuffer || !heightMapLocation) {
			throw new Error('WebGL initialization failed');
		}

		const heightMap = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, heightMap);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		gl.useProgram(program);
		gl.uniform1i(heightMapLocation, 0);

		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		const blob = await canvas.convertToBlob();
		if (!blob) {
			throw new Error('Failed to convert canvas to blob');
		}
		const reader = new FileReader();
		reader.onloadend = () => {
			self.postMessage({ id: url, buffer: reader.result });
		};
		reader.readAsArrayBuffer(blob);
	} catch (error) {
		self.postMessage({ id: url, buffer: new ArrayBuffer(0) });
	}
};
