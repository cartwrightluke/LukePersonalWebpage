﻿precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;

void main(void) {
	vec4 tmp = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));
    gl_FragColor = tmp;
}

