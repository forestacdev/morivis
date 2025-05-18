#version 300 es
precision highp float;


uniform sampler2D u_textureR;
uniform sampler2D u_textureG;
uniform sampler2D u_textureB;
uniform sampler2D u_textureBitmapR;

in vec2 v_tex_coord ;
out vec4 fragColor;




void main() {
    vec2 uv = v_tex_coord;
  	float r = texture(u_textureR, uv).r;
	float g = texture(u_textureG, uv).r;
	float b = texture(u_textureB, uv).r;

    float bitmapR = texture(u_textureBitmapR, uv).r;

    fragColor = vec4(bitmapR, bitmapR, bitmapR, 1.0);

}