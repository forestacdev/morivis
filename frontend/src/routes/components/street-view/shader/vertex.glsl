varying vec4 coords;
varying vec2 vUv;
varying vec3 v_modelPosition;

void main()	{
    vUv = uv;
    v_modelPosition = position;

	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );


	coords = modelMatrix * vec4( position, 1.0 );

	gl_Position = projectionMatrix * mvPosition;

}