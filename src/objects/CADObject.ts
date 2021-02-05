class CADObject {
    public pos: [number, number];
    public color: [number, number, number, number];
    public shader: WebGLProgram;
    public gl: WebGL2RenderingContext;
    public va: Array<number>;
    public vab: WebGLBuffer;
    public type: number;

    constructor(type: number, shader: WebGLProgram, gl: WebGL2RenderingContext, pos?: [number, number], color?: [number, number, number, number]) {
        this.shader = shader;
        this.gl = gl;
        this.type = type;
    }
    
    assignVertexArray(va: Array<number>) { this.va = va }
    
    bind() {
        const gl = this.gl
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.va), gl.STATIC_DRAW)
        this.vab = buf
    }

    draw() {
        this.bind()
        const gl = this.gl
        const vertexPos = gl.getAttribLocation(this.shader, 'attrib_vertexPos')
        const uniformCol = gl.getUniformLocation(this.shader, 'u_fragColor')
        gl.vertexAttribPointer(
            vertexPos,
            2, // it's 2 dimensional
            gl.FLOAT,
            false,
            0,
            0
        )
        gl.enableVertexAttribArray(vertexPos)
        if (this.color) {
            gl.uniform4fv(uniformCol, this.color)
        }
        gl.useProgram(this.shader)
        gl.drawArrays(this.type, 0, this.va.length/2)
    }
}

export default CADObject