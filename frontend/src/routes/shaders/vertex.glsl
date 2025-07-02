varying vec2 vUv;// fragmentShaderに渡すためのvarying変数
varying vec3 vPosition;
uniform float uTime;
varying vec3 vNormal;
varying mat4 vModelMatrix;
varying mat4 v_modelMatrix;
varying float v_fogDistance;

layout(location = 0) in vec3 aPos; // 頂点の位置

void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;
    vModelMatrix = modelMatrix;
    // ワールド座標を計算
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    v_modelMatrix = modelMatrix;

    // 中心 (0, 0, 0) からの距離を計算
    v_fogDistance = length(worldPosition.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}