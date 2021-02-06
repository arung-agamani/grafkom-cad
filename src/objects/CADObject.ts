class CADObject {
    public pos: [number, number];
    public color: [number, number, number, number];
    public shader: WebGLProgram;
    public gl: WebGL2RenderingContext;
    public va: Array<number>;
    public vab: WebGLBuffer;
    public type: number;
    public objType: number;
    public name: string;
    public id: number;
    public isSelected: boolean = false;

    constructor(type: number, shader: WebGLProgram, gl: WebGL2RenderingContext, objType: number, pos?: [number, number], color?: [number, number, number, number]) {
        this.shader = shader;
        this.gl = gl;
        this.type = type;
        this.objType = objType;
    }
    
    assignVertexArray(va: Array<number>) { this.va = va }
    assignName(name: string) { this.name = name }
    assignId(id: number) { this.id = id }
    setSelected(isSelected: boolean) { this.isSelected = isSelected }
    
    bind() {
        const gl = this.gl
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.va), gl.STATIC_DRAW)
        this.vab = buf
    }
    

    draw(withProgram?: WebGLProgram) {
        this.bind()
        const program = withProgram || this.shader
        const gl = this.gl
        gl.useProgram(program)
        const vertexPos = gl.getAttribLocation(program, 'attrib_vertexPos')
        const uniformCol = gl.getUniformLocation(program, 'u_fragColor')
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
        gl.drawArrays(this.type, 0, this.va.length/2)
    }

    drawSelect(selectProgram: WebGLProgram) {
        this.bind()
        const gl = this.gl
        const id = this.id
        gl.useProgram(selectProgram)
        const vertexPos = gl.getAttribLocation(selectProgram, 'a_Pos')
        const uniformCol = gl.getUniformLocation(selectProgram, 'u_id')
        gl.vertexAttribPointer(
            vertexPos,
            2, // it's 2 dimensional
            gl.FLOAT,
            false,
            0,
            0
        )
        gl.enableVertexAttribArray(vertexPos)
        const uniformId = [
            ((id >> 0) & 0xFF) / 0xFF,
            ((id >> 8) & 0xFF) / 0xFF,
            ((id >> 16) & 0xFF) / 0xFF,
            ((id >> 24) & 0xFF) / 0xFF,
        ]
        gl.uniform4fv(uniformCol, uniformId)
        gl.drawArrays(this.type, 0, this.va.length/2)
    }
}

export default CADObject