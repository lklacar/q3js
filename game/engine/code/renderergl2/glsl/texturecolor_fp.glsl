#ifdef GL_ES
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif
  precision mediump int;
#endif


uniform sampler2D u_DiffuseMap;
uniform vec4      u_Color;

varying vec2      var_Tex1;


void main()
{
	gl_FragColor = texture2D(u_DiffuseMap, var_Tex1) * u_Color;
}
