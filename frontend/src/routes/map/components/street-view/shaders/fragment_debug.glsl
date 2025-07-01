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
    vec4 textureA = sampleTexture(textureA, rotationAnglesA);
    vec4 textureB = sampleTexture(textureB, rotationAnglesB);

    textureA = textureA * textureA.a; // アルファブレンディング
    textureB = textureB * textureB.a; // アルファブレンディング

    vec4 color = mix(textureA, textureB, clamp((time - fadeStartTime) * fadeSpeed, 0.0, 1.0));

    
    
    gl_FragColor = color;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}