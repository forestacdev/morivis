uniform samplerCube skybox;	
uniform vec3 rotationAngles;

varying vec4 coords;

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

// mat3 rotateY(float angle) {
//     float s = sin(-angle);
//     float c = cos(-angle);
//     return mat3(
//         c,  0, -s,
//         0,  1,  0,
//         s,  0,  c
//     );
// }

// mat3 rotateX(float angle) {
//     float s = sin(-angle);
//     float c = cos(-angle);
//     return mat3(
//         1,  0,  0,
//         0,  c, s,
//         0, -s, c
//     );
// }

// mat3 rotateZ(float angle) {
//     float s = sin(-angle);
//     float c = cos(-angle);
//     return mat3(
//         c, s,  0,
//        -s, c,  0,
//         0,  0,  1
//     );
// }

// void main() {
//     // XYZ回転を適用（Y → X → Z の順）
//     mat3 rotationMatrix = rotateZ(rotationAngles.z) * rotateX(rotationAngles.x) * rotateY(rotationAngles.y);
    
//     vec3 rotatedCoords = rotationMatrix * coords.xyz;
//     gl_FragColor = textureCube(skybox, rotatedCoords);

//     #include <tonemapping_fragment>
//     #include <colorspace_fragment>
// }

void main() {
    // X軸を反転（またはY軸）
    vec3 correctedCoords = vec3(-coords.x, coords.y, coords.z);
    gl_FragColor = textureCube(skybox, correctedCoords);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}

