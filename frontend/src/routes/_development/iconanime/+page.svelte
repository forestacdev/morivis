<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl, { MapMouseEvent, type LngLatLike } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	let map: maplibregl.Map | null = null;
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	const size = 200; // アイコンのサイズ

	const pulsingDotWebGL = {
		width: size,
		height: size,
		data: new Uint8Array(size * size * 4), // RGBA ピクセルデータ

		// WebGL関連のプロパティ
		gl: null, // WebGLコンテキスト
		program: null, // シェーダープログラム
		positionBuffer: null, // 頂点バッファー (画面全体を覆う四角形)
		fbo: null, // フレームバッファーオブジェクト
		texture: null, // FBOにアタッチするテクスチャ
		timeLocation: null, // シェーダーの uniform 変数 'u_time' のロケーション
		positionAttributeLocation: null, // シェーダーの attribute 変数 'a_position' のロケーション

		onAdd() {
			// Canvas要素を作成し、WebGLコンテキストを取得
			const canvas = document.createElement('canvas');
			canvas.width = this.width;
			canvas.height = this.height;
			// MapLibre GL が使用するコンテキストと共有できないため、新しいコンテキストを作成
			this.gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false }); // premultipliedAlpha は MapLibre GL の要件に合わせる, antialias はオフスクリーンなので不要

			const gl = this.gl;

			if (!gl) {
				console.error('WebGL is not supported');
				return;
			}

			// 1. 頂点シェーダーとフラグメントシェーダーのソースコードを定義
			const vsSource = `
                attribute vec4 a_position;
                void main() {
                    gl_Position = a_position;
                }
            `; // 画面全体を覆うシンプルな頂点シェーダー (NDC座標 -1.0〜1.0)

			const fsSource = `
                precision mediump float;
                uniform float u_time;
                // varying vec2 v_uv; // このシンプルなVSではvaryingは使わない

                void main() {
                    // gl_FragCoord はウィンドウ座標。これを0-1のテクスチャ座標に正規化
                    vec2 uv = gl_FragCoord.xy / vec2(${size}.0, ${size}.0);

                    vec2 center = vec2(0.5, 0.5);
                    float dist = distance(uv, center); // 中心からの距離 (0-1)

                    float innerRadius = 0.3 * 0.5; // アイコンサイズの割合で半径を計算 (0-1) -> size/2 * 0.3 に相当
                    float pulseInnerRadius = 0.3 * 0.5; // 波紋の開始半径 -> size/2 * 0.3 に相当
                    float pulseOuterRadius = 0.7 * 0.5;  // 波紋の終了半径 -> size/2 * 0.7 に相当
                    float pulseDuration = 1.0;   // アニメーションサイクル内の時間 (0-1, renderのdurationと同期)
                    float pulseTime = mod(u_time, pulseDuration); // アニメーションサイクル内の時間 (0-1)

                    float alpha = 0.0;
                    vec3 color = vec3(0.0);

                    // 内側の円 (Canvas版のfillStyleとfillに相当)
                    if (dist < innerRadius) {
                        // Canvas版の 'rgba(255, 100, 100, 1)' に近い色
                        color = vec3(1.0, 100.0/255.0, 100.0/255.0);
                        alpha = 1.0;
                    }
                    // 外側の波紋 (Canvas版のarcとstrokeに相当)
                    else {
                         // 波紋の現在の半径範囲を時間 t で補間
                         // 波紋の中心は pulseInnerRadius から pulseOuterRadius まで移動
                        float currentPulseCenter = mix(pulseInnerRadius, pulseOuterRadius, pulseTime);
                        // 波紋の太さの目安 (調整が必要) Canvas版の lineWidth に相当する効果を模倣
                        float pulseBandwidth = (2.0 + 4.0 * (1.0 - pulseTime)) * (0.5 / size); // ピクセル幅を0-1スケールに変換

                         // 現在の距離が波紋の中心半径から pulseBandwidth / 2 の範囲内にあるか
                        if (abs(dist - currentPulseCenter) < pulseBandwidth * 0.5) {
                             // 波紋の中心に近づくほどアルファを高く (三角関数や smoothstep を使うともっと滑らかになる)
                             // ここでは単純な線形補間
                            float bandAlpha = 1.0 - (abs(dist - currentPulseCenter) / (pulseBandwidth * 0.5));

                             // Canvas版の rgba(255, 200, 200, ${1 - t}) に近い色とアルファ
                            color = vec3(1.0, 200.0/255.0, 200.0/255.0);
                            alpha = bandAlpha * (1.0 - pulseTime); // 時間経過で波紋全体も薄く
                        }
                    }


                    // アルファ値を乗算済みアルファにする MapLibre GL のテクスチャ要件に合わせるため
                    gl_FragColor = vec4(color * alpha, alpha); // Premultiplied Alpha
                }
            `;

			// 2. シェーダーをコンパイルし、プログラムをリンクする
			const vertexShader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vertexShader, vsSource);
			gl.compileShader(vertexShader);
			if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
				console.error('Vertex shader compilation failed:', gl.getShaderInfoLog(vertexShader));
				gl.deleteShader(vertexShader);
				return;
			}

			const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fragmentShader, fsSource);
			gl.compileShader(fragmentShader);
			if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
				console.error('Fragment shader compilation failed:', gl.getShaderInfoLog(fragmentShader));
				gl.deleteShader(vertexShader);
				gl.deleteShader(fragmentShader);
				return;
			}

			this.program = gl.createProgram();
			gl.attachShader(this.program, vertexShader);
			gl.attachShader(this.program, fragmentShader);
			gl.linkProgram(this.program);

			if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
				console.error('Shader program linking failed:', gl.getProgramInfoLog(this.program));
				gl.deleteProgram(this.program);
				gl.deleteShader(vertexShader);
				gl.deleteShader(fragmentShader);
				this.program = null;
				return;
			}

			// シェーダーはもう不要なので削除
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);

			// 3. 頂点バッファー (画面全体を覆う四角形) を作成し、データをバインドする
			// NDC座標 (-1.0 to 1.0) で画面全体を覆う2つの三角形
			const positions = new Float32Array([
				-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0
			]);
			this.positionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

			// 4. attribute 変数 'a_position' のロケーションを取得
			this.positionAttributeLocation = gl.getAttribLocation(this.program, 'a_position');
			// uniform 変数 'u_time' のロケーションを取得
			this.timeLocation = gl.getUniformLocation(this.program, 'u_time');

			// 5. フレームバッファーオブジェクト (FBO) を作成する
			this.fbo = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

			// 6. FBOにアタッチするためのテクスチャを作成する (サイズは this.width x this.height)
			this.texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				this.width,
				this.height,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				null
			);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			// 7. FBOにテクスチャをカラーアタッチメントとしてアタッチする
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

			// 8. FBOが完全かチェックする
			if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
				console.error('Framebuffer is not complete.');
				// エラー時はリソースを解放して終了
				gl.deleteFramebuffer(this.fbo);
				gl.deleteTexture(this.texture);
				gl.deleteBuffer(this.positionBuffer);
				gl.deleteProgram(this.program);
				this.fbo = null;
				this.texture = null;
				this.positionBuffer = null;
				this.program = null;
				return;
			}

			// デフォルトのフレームバッファーに戻す
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			// -------------------------------------------------------------
			console.log('WebGL pulsing dot initialized.');
		},

		// StyleImageInterface: マップがフレームをレンダリングする前に呼ばれる
		render() {
			const duration = 1000; // アニメーションの総時間 (ms)
			const t = (performance.now() % duration) / duration; // 現在のアニメーション時間 (0-1)
			const gl = this.gl;

			if (
				!gl ||
				!this.program ||
				!this.fbo ||
				this.positionAttributeLocation === null ||
				this.timeLocation === null
			) {
				// 初期化が失敗した場合など
				return false;
			}

			// ここに WebGL の描画コードが入ります
			// 1. FBOをバインドして、描画先をテクスチャにする
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

			// 2. ビューポートをアイコンのサイズに設定
			gl.viewport(0, 0, this.width, this.height);

			// 3. クリア処理
			gl.clearColor(0.0, 0.0, 0.0, 0.0); // 透明でクリア
			gl.clear(gl.COLOR_BUFFER_BIT);

			// 4. シェーダープログラムを使用
			gl.useProgram(this.program);

			// 5. uniform変数 'u_time' に現在の時間 t を設定
			gl.uniform1f(this.timeLocation, t);

			// 6. 頂点バッファーをバインドし、属性ポインタを設定
			gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
			gl.enableVertexAttribArray(this.positionAttributeLocation);
			// a_position は vec4 だが、ここでは vec2 の XY のみ使用。size=2, type=FLOAT
			gl.vertexAttribPointer(this.positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

			// 7. 描画コマンドを発行する (2つの三角形で四角形を描画)
			gl.drawArrays(gl.TRIANGLES, 0, 6); // 6つの頂点を使用

			// 8. FBOのバインドを解除し、デフォルトのフレームバッファーに戻す
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);

			// 9. FBOに描画されたテクスチャからピクセルデータを読み出す
			// gl.readPixels(x, y, width, height, format, type, dstData)
			gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, this.data);

			// MapLibre GL にこの画像が更新されたことを通知し、再描画を促す
			map.triggerRepaint();

			// true を返すと、MapLibre GL はこの画像が更新されたと判断して使用します
			return true;
		},

		// StyleImageInterface: 画像がマップから削除されたときに呼ばれる (クリーンアップ用)
		onRemove() {
			const gl = this.gl;
			if (gl) {
				// WebGLリソースの解放
				if (this.program) gl.deleteProgram(this.program);
				if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
				if (this.fbo) gl.deleteFramebuffer(this.fbo);
				if (this.texture) gl.deleteTexture(this.texture);
			}
			// プロパティをリセット
			this.gl = null;
			this.program = null;
			this.positionBuffer = null;
			this.fbo = null;
			this.texture = null;
			this.timeLocation = null;
			this.positionAttributeLocation = null;
			console.log('WebGL pulsing dot cleaned up.');
		}
	};

	const pulsingDot2 = {
		width: size,
		height: size,
		data: new Uint8Array(size * size * 4),

		// get rendering context for the map canvas when layer is added to the map
		onAdd() {
			const canvas = document.createElement('canvas');
			canvas.width = this.width;
			canvas.height = this.height;
			this.context = canvas.getContext('2d');
		},

		// called once before every frame where the icon will be used
		render() {
			const duration = 1000;
			const t = (performance.now() % duration) / duration;

			const radius = (size / 2) * 0.3;
			const outerRadius = (size / 2) * 0.7 * t + radius;
			const context = this.context;

			// draw outer circle
			context.clearRect(0, 0, this.width, this.height);
			context.beginPath();
			context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
			context.fillStyle = `rgba(255, 200, 200,${1 - t})`;
			context.fill();

			// draw inner circle
			context.beginPath();
			context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
			context.fillStyle = 'rgba(255, 100, 100, 1)';
			context.strokeStyle = 'white';
			context.lineWidth = 2 + 4 * (1 - t);
			context.fill();
			context.stroke();

			// update this image's data with data from the canvas
			this.data = context.getImageData(0, 0, this.width, this.height).data;

			// continuously repaint the map, resulting in the smooth animation of the dot
			map.triggerRepaint();

			// return `true` to let the map know that the image was updated
			return true;
		}
	};

	// コンポーネントがマウントされたときにマップを初期化
	onMount(() => {
		if (!mapContainer) {
			console.error('Map container is not defined');
			return;
		}

		// MapLibreマップの初期化
		map = new maplibregl.Map({
			container: mapContainer,
			style: {
				version: 8,
				glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
				sources: {
					pales: {
						type: 'raster',
						tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
						tileSize: 256,
						maxzoom: 18,
						attribution: "<a href='https://www.gsi.go.jp/' target='_blank'>国土地理院</a>"
					}
				},
				layers: [
					{
						id: 'pales_layer',
						source: 'pales',
						type: 'raster'
					}
				]
			},
			center: [139.477, 35.681], // 初期表示の中心座標
			zoom: 9 // 初期ズームレベル
		});
		map.on('load', () => {
			// WebGLで描画するカスタム画像を登録
			// pixelRatio は Canvas 版と同様に考慮する必要があるかもしれません
			map.addImage('pulsing-dot-webgl', pulsingDot2, { pixelRatio: 2 });

			map.addSource('points', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [139.477, 35.681] // 例として中心に配置
							}
						}
					]
				}
			});

			map.addLayer({
				id: 'points-webgl',
				type: 'symbol',
				source: 'points',
				layout: {
					'icon-image': 'pulsing-dot-webgl', // WebGLで描画するカスタム画像
					'icon-allow-overlap': true // アイコンの重なりを許容する場合
				}
			});
		});
	});
</script>

<div bind:this={mapContainer} class="w-hull h-full"></div>
