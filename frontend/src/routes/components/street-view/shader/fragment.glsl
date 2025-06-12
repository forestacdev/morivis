const float PI = 3.14159265359;
const float INV_PI = 1.0 / PI;
const float INV_TWO_PI = 1.0 / (2.0 * PI);

// X軸回りの3Dベクトル回転関数
vec3 rotateX(vec3 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat3 rotationMatrix = mat3(
        1.0, 0.0, 0.0,
        0.0, c,   -s,
        0.0, s,   c
    );
    return rotationMatrix * p;
}

// Y軸回りの3Dベクトル回転関数
vec3 rotateY(vec3 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat3 rotationMatrix = mat3(
        c,   0.0, s,
        0.0, 1.0, 0.0,
        -s,  0.0, c
    );
    return rotationMatrix * p;
}

// Z軸回りの3Dベクトル回転関数
vec3 rotateZ(vec3 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat3 rotationMatrix = mat3(
        c,   -s,  0.0,
        s,   c,   0.0,
        0.0, 0.0, 1.0
    );
    return rotationMatrix * p;
}

// 3D方向ベクトルをエクイレクタングラーUV座標に変換する関数
vec2 directionToEquirectangularUV(vec3 dir) {
    dir = normalize(dir);
    float u = atan(dir.x, dir.z) * INV_TWO_PI + 0.5;
    float v = asin(dir.y) * INV_PI + 0.5;
    return vec2(u, v);
}

uniform sampler2D textureA;
uniform sampler2D textureB;
uniform float fadeStartTime;
uniform float fadeSpeed;
uniform float time;
varying vec2 vUv;
varying vec3 v_modelPosition;
uniform vec3 rotationAnglesA; // テクスチャAに対応する角度
uniform vec3 rotationAnglesB; // テクスチャBに対応する角度

void main() {
    vec3 samplingDirection = normalize(v_modelPosition);

    // テクスチャAのためのUV計算
    vec3 rotatedDirectionA = samplingDirection;
    rotatedDirectionA = rotateY(rotatedDirectionA, rotationAnglesA.y);
    rotatedDirectionA = rotateX(rotatedDirectionA, rotationAnglesA.z);
    rotatedDirectionA = rotateZ(rotatedDirectionA, rotationAnglesA.x);
    vec2 uvA = directionToEquirectangularUV(rotatedDirectionA);
    uvA.x = 1.0 - uvA.x; // U座標を反転

    // テクスチャBのためのUV計算
    vec3 rotatedDirectionB = samplingDirection;
    rotatedDirectionB = rotateY(rotatedDirectionB, rotationAnglesB.y);
    rotatedDirectionB = rotateX(rotatedDirectionB, rotationAnglesB.z);
    rotatedDirectionB = rotateZ(rotatedDirectionB, rotationAnglesB.x);
    vec2 uvB = directionToEquirectangularUV(rotatedDirectionB);
    uvB.x = 1.0 - uvB.x; // U座標を反転

    // 各テクスチャをサンプリング
    vec4 colorA = texture2D(textureA, uvA);
    vec4 colorB = texture2D(textureB, uvB);
    
    // フェード進行度を計算（0.0 = B表示、1.0 = A表示）
    float fadeProgress = (time - fadeStartTime) * fadeSpeed;
    fadeProgress = clamp(fadeProgress, 0.0, 1.0);
    
    // スムーズステップでより自然なフェード
    float smoothFade = smoothstep(0.0, 1.0, fadeProgress);
    
    // フェードが開始されていない場合（fadeStartTime <= 0.0）はAのみ表示
    float shouldFade = step(0.001, fadeStartTime);
    
    gl_FragColor = mix(colorA, mix(colorB, colorA, smoothFade), shouldFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}