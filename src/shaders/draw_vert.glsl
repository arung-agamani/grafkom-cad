attribute vec2 attrib_vertexPos;

uniform vec2 u_resolution;
uniform vec2 u_pos;

void main() {
    vec2 zeroToOne = (attrib_vertexPos + u_pos) / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, 1), 0, 1);
}