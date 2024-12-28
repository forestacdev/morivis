#version 300 es
in vec4 aPosition;
out vec2 vTexCoord;

void main() {
    gl_Position = aPosition;
    vTexCoord = vec2(aPosition.x * 0.5 + 0.5, aPosition.y * -0.5 + 0.5); // Y軸を反転
}