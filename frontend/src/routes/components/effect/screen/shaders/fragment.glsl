#version 300 es
precision highp float;

in vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;

out vec4 outColor;

void main() {
    vec2 center = vec2(0.5, 0.5);

    // アスペクト補正してから中心との距離を算出
    vec2 delta = (v_uv - center);
    delta.x *= u_resolution.x / u_resolution.y;
    vec2 r = u_resolution;
    vec2 p = (gl_FragCoord.xy *2. -r) / min(r.x,r.y);
    // float dist = length(p);
    float dist = length(delta);

    // グラデーション：中心が明るく、外側が暗い
    float gradient = smoothstep(0.5, 0.9, dist); // 0 → 1 に滑らかに変化

    // 最終色（背景色が白なら暗く見える）
    vec3 color = vec3(0.0); // 黒
    float alpha = gradient * 0.8; // 外側だけ強く見える

    outColor = vec4(color, alpha);
}

// void main(){
//   vec2 r = u_resolution;
//   vec2 p = (gl_FragCoord.xy *2. -r) / min(r.x,r.y);
//   float dist = length(p);
//   float glow = smoothstep(0.9, 0.0, dist);
//   outColor = vec4(vec3(glow), 0.5);
// }

