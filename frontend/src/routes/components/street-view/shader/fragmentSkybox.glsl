

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