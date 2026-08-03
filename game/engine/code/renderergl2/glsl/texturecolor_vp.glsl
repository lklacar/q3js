#ifdef GL_ES
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif
  precision mediump int;
#endif


attribute vec3 attr_Position;
attribute vec4 attr_TexCoord0;

uniform mat4   u_ModelViewProjectionMatrix;

varying vec2   var_Tex1;


void main()
{
	gl_Position = u_ModelViewProjectionMatrix * vec4(attr_Position, 1.0);
	var_Tex1 = attr_TexCoord0.st;
}
