#version 300 es
precision highp float;
out vec4 outColor;
uniform vec4 u_color;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    float time = u_time / 1.0; // 3秒周期
    vec2 uv = (gl_FragCoord.xy - u_resolution.xy * 0.5) / 200.0;
    
    vec2 p = uv;

    float centerDistY = p.y; 
    float offset = p.y * 0.5; 


    float line = mod(p.x - time + offset, 1.9) < 0.9 ? 1.0 : 0.0;
    vec3 mainColor = vec3(1.0, 1.0, 0.0);
    vec3 color = mix(mainColor, mainColor, line);
    outColor = vec4(color, line * 0.8);
    outColor = vec4(1.0);
}