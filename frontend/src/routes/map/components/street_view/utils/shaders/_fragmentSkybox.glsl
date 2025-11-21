

varying vec4 coords;

uniform samplerCube skybox;

uniform vec3 rotationAngles;

varying vec2 vUv;


// --- 回転行列を定義 ---
mat3 rotateY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        c,  0, s,
        0,  1, 0,
       -s,  0, c
    );
}

mat3 rotateX(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        1,  0,  0,
        0,  c, -s,
        0,  s,  c
    );
}

mat3 rotateZ(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        c, -s,  0,
        s,  c,  0,
        0,  0,  1
    );
}


void main() {



    // X 軸を反転させた座標を基準にする
    vec3 correctedCoords = vec3(-coords.x, coords.y, coords.z);
    // 回転行列を適用（Y → X → Z の順）
    // Y軸から受け取る角度はマイナスにする
    mat3 rotationMatrix = rotateY(-rotationAngles.y) * rotateX(-rotationAngles.x) * rotateZ(-rotationAngles.z);
    // 回転を適用
    vec3 rotatedCoords = rotationMatrix * correctedCoords;

    // 環境マップのテクスチャを取得
    vec4 skyboxScreen = textureCube(skybox, rotatedCoords);

    gl_FragColor = skyboxScreen;


    // トーンマッピングと色空間変換を適用
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}



// const url = imageUrl.replace('.JPG', '/');
// try {
// 	// 各画像のURLを直接指定
// 	const faceUrls = [
// 		`${url}face_1.jpg`,
// 		`${url}face_2.jpg`,
// 		`${url}face_3.jpg`,
// 		`${url}face_4.jpg`,
// 		`${url}face_5.jpg`,
// 		`${url}face_6.jpg`
// 	];
// 	const textureLodrer = new THREE.TextureLoader();
// 	// 画像を読み込む
// 	// テクスチャが読み込まれたらズームブラーを停止
// 	// CubeTextureLoader を使用してテクスチャを読み込む
// 	const textureCube = new THREE.CubeTextureLoader();
// 	textureCube.load(
// 		faceUrls,
// 		(texture) => {
// 			texture.colorSpace = THREE.SRGBColorSpace;
// 			if (!angleData) return;
// 			geometryBearing.x = angleData.angleX;
// 			geometryBearing.y = angleData.angleY;
// 			geometryBearing.z = angleData.angleZ;
// 			// GUI側のコントロールの値を更新
// 			if ($isDebugMode) {
// 				controllerX.setValue(geometryBearing.x);
// 				controllerY.setValue(geometryBearing.y);
// 				controllerZ.setValue(geometryBearing.z);
// 			}
// 			isLoading = false;
// 			// isAnimating = false;
// 			uniforms.skybox.value = texture;
// 			placeSpheres(nextPointData);
// 		},
// 		undefined,
// 		(error) => {
// 			console.error('テクスチャの適用に失敗しました', error);
// 			isLoading = false;
// 			// isAnimating = false;
// 		}
// 	);
// } catch (error) {
// 	console.error('画像の取得に失敗しました', error);
// 	isLoading = false;
// }
