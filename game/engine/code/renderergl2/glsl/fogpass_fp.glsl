#ifdef GL_ES
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif
  precision mediump int;
#endif


uniform vec4  u_Color;

varying float var_Scale;

void main()
{
	gl_FragColor = u_Color;
	gl_FragColor.a = sqrt(clamp(var_Scale, 0.0, 1.0));
}
