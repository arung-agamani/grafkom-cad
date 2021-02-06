attribute vec2 a_Pos;

uniform vec2 u_resolution;
uniform mat3 u_pos;

void main() {
    vec2 position = (u_pos * vec3(a_Pos, 1)).xy;
    vec2 zeroToOne = position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, 1), 0, 1);
}