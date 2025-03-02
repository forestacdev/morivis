varying vec4 coords;

void main()	{

	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

	coords = modelMatrix * vec4( position, 1.0 );

	gl_Position = projectionMatrix * mvPosition;

}