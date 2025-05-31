

varying vec4 coords;
varying vec3 v_modelPosition;

uniform samplerCube skybox;	
uniform sampler2D shingleTexture;
uniform vec3 rotationAngles;

varying vec2 vUv;




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





void main() {
    vec3 samplingDirection = normalize(v_modelPosition);

            // サンプリング方向ベクトルをY軸周りに回転

    vec3 rotatedDirection = samplingDirection;
    rotatedDirection = rotateY(rotatedDirection, rotationAngles.y);
    rotatedDirection = rotateX(rotatedDirection, rotationAngles.z);
    rotatedDirection = rotateZ(rotatedDirection, rotationAngles.x);


    // 回転後の方向ベクトルをエクイレクタングラーUV座標に変換
    vec2 uv = directionToEquirectangularUV(rotatedDirection);
     // ★★★ U座標をここで反転 ★★★
    uv.x = 1.0 - uv.x;

    vec4 texture = texture2D(shingleTexture, uv);

    gl_FragColor = texture;
}