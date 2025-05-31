varying vec4 coords;
varying vec2 vUv;

void main()	{
     vUv = uv;

	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

	coords = modelMatrix * vec4( position, 1.0 );

	gl_Position = projectionMatrix * mvPosition;

}