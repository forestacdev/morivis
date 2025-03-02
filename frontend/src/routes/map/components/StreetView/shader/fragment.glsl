	uniform samplerCube skybox;	

	varying vec4 coords;

  void main() {

    gl_FragColor = textureCube(skybox, coords.xyz);
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
		
  }