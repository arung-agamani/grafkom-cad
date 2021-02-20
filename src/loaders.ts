export const loadShader = async (gl: WebGL2RenderingContext, type: number, source: string) => {
    const rawShader = await fetchShader(source)
    const shader = gl.createShader(type)
    gl.shaderSource(shader, rawShader)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('Error when compiling shaders: ' + gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

export async function fetchShader(source: string) {
    const shader = await fetch('/shaders/' + source).then(res => res.text())
    return shader
}