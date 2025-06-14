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
uniform sampler2D textureC;
uniform float fadeStartTime;
uniform float fadeSpeed;
uniform float time;
varying vec2 vUv;
varying vec3 v_modelPosition;
uniform vec3 rotationAnglesA;
uniform vec3 rotationAnglesB;
uniform vec3 rotationAnglesC;
uniform float fromTarget; // フェード元 0=A, 1=B, 2=C
uniform float toTarget;   // フェード先 0=A, 1=B, 2=C

vec4 sampleTexture(sampler2D tex, vec3 rotationAngles) {
    vec3 samplingDirection = normalize(v_modelPosition);
    
    // 角度補正
    vec3 rotatedDirection = samplingDirection;
    rotatedDirection = rotateY(rotatedDirection, rotationAngles.y);
    rotatedDirection = rotateX(rotatedDirection, rotationAngles.z);
    rotatedDirection = rotateZ(rotatedDirection, rotationAngles.x);
    
    vec2 uv = directionToEquirectangularUV(rotatedDirection);
    uv.x = 1.0 - uv.x;
    
    return texture2D(tex, uv);
}

void main() {
    // フェード進行度を計算
    float fadeProgress = (time - fadeStartTime) * fadeSpeed;
    fadeProgress = clamp(fadeProgress, 0.0, 1.0);
    float smoothFade = smoothstep(0.0, 1.0, fadeProgress);
    
    // フェードが開始されているかチェック
    float shouldFade = step(0.001, fadeStartTime);
    
    // fromTargetとtoTargetに基づいて正確にテクスチャを選択
    vec4 fromColor;
    vec4 toColor;
    
    // フェード元テクスチャを決定
    if (fromTarget < 0.5) {
        fromColor = sampleTexture(textureA, rotationAnglesA);
    } else if (fromTarget < 1.5) {
        fromColor = sampleTexture(textureB, rotationAnglesB);
    } else {
        fromColor = sampleTexture(textureC, rotationAnglesC);
    }
    
    // フェード先テクスチャを決定
    if (toTarget < 0.5) {
        toColor = sampleTexture(textureA, rotationAnglesA);
    } else if (toTarget < 1.5) {
        toColor = sampleTexture(textureB, rotationAnglesB);
    } else {
        toColor = sampleTexture(textureC, rotationAnglesC);
    }
    
    // フェード元テクスチャが存在するかチェック
    float hasFromTexture = step(0.1, length(fromColor.rgb));
    
    // フェード処理
    vec4 finalColor;
    if (shouldFade > 0.5 && hasFromTexture > 0.5) {
        // フェード中：fromColor → toColor
        finalColor = mix(fromColor, toColor, smoothFade);
    } else {
        // フェードなし：toColorのみ表示
        finalColor = toColor;
    }
    
    gl_FragColor = finalColor;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}