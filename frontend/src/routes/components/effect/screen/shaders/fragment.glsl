#version 300 es
precision highp float;

in vec2 v_uv;
uniform vec2 resolution;
uniform float time;

out vec4 outColor;

void main() {
    vec2 center = vec2(0.5, 0.5);

    // アスペクト補正してから中心との距離を算出
    vec2 delta = (v_uv - center);
    delta.x *= resolution.x / resolution.y;
    vec2 r = resolution;
    vec2 p = (gl_FragCoord.xy *2. -r) / min(r.x,r.y);
    // float dist = length(p);
    float dist = length(delta);

    // グラデーション：中心が明るく、外側が暗い
    float gradient = smoothstep(0.5, 0.9, dist); // 0 → 1 に滑らかに変化



    vec2 position = ( gl_FragCoord.xy / resolution.xy ) / 4.0;

	float color = 0.0;
	color += sin( position.x * cos( time / 15.0 ) * 80.0 ) + cos( position.y * cos( time / 15.0 ) * 10.0 );
	color += sin( position.y * sin( time / 10.0 ) * 40.0 ) + cos( position.x * sin( time / 25.0 ) * 40.0 );
	color += sin( position.x * sin( time / 5.0 ) * 10.0 ) + sin( position.y * sin( time / 35.0 ) * 80.0 );
	color *= sin( time / 10.0 ) * 0.5;

    // 画面全体に色を適用
    outColor = vec4(vec3(color), 0.7);


   
}

// void main(){
//   vec2 r = u_resolution;
//   vec2 p = (gl_FragCoord.xy *2. -r) / min(r.x,r.y);
//   float dist = length(p);
//   float glow = smoothstep(0.9, 0.0, dist);
//   outColor = vec4(vec3(glow), 0.5);
// }

