

varying vec4 coords;

uniform samplerCube skybox;	
uniform sampler2D shingleTexture;	
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

    vec4 texture = texture2D(shingleTexture, vUv);

    gl_FragColor = texture;
 
}