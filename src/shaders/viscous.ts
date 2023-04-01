export const FRAGMENT_SHADER = `
precision highp float;

uniform sampler2D velocity;
uniform sampler2D velocity_new;
uniform float v;
uniform vec2 px;
uniform float dt;

varying vec2 uv;

void main(){
    vec2 old = texture2D(velocity, uv).xy;
    vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0)).xy;
    vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0)).xy;
    vec2 new2 = texture2D(velocity_new, uv + vec2(0, px.y * 2.0)).xy;
    vec2 new3 = texture2D(velocity_new, uv - vec2(0, px.y * 2.0)).xy;

    vec2 new = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
    new /= 4.0 * (1.0 + v * dt);
    
    gl_FragColor = vec4(new, 0.0, 0.0);
}
`;

// In order to perform iterative calculations, the fbo that stores the calculation results and the fbo of the latest calculation results are alternately replaced.
let fbo_in, fbo_out;
this.uniforms.v.value = viscous;
for (let i = 0; i < iterations; i++) {
  if (i % 2 == 0) {
    fbo_in = this.props.output0;
    fbo_out = this.props.output1;
  } else {
    fbo_in = this.props.output1;
    fbo_out = this.props.output0;
  }

  this.uniforms.velocity_new.value = fbo_in.texture;
  this.props.output = fbo_out;
  this.uniforms.dt.value = dt;
}
