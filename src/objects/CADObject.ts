import { ObjectData } from '../interfaces';
import { multiplyMatrix, addMatrix } from '../renderer/utils'

class CADObject {
    public pos: [number, number] = [0,0];
    public anchorPoint: [number, number];
    public rotation: number;
    public scale: [number, number];
    public color: [number, number, number, number];
    public originalColor: [number, number, number, number];
    public shader: WebGLProgram;
    public gl: WebGL2RenderingContext;
    public va: Array<number>;
    public ia_length: number;
    public vab: WebGLBuffer;
    public type: number;
    public objType: number;
    public name: string;
    public id: number;
    public isSelected: boolean = false;
    public projectionMatrix: Array<number>;

    constructor(type: number, shader: WebGLProgram, gl: WebGL2RenderingContext, objType: number, pos?: [number, number], color?: [number, number, number, number]) {
        this.shader = shader;
        this.gl = gl;
        this.type = type;
        this.objType = objType;
        this.color = [0.5, 0.5, 0.5, 1.0]
    }

    getData(): ObjectData {
        const obj: ObjectData = {
            pos: this.pos,
            anchorPoint: this.anchorPoint,
            rotation: this.rotation,
            scale: this.scale,
            color: this.color,
            originalColor: this.originalColor,
            ia_length: this.ia_length,
            va: this.va,
            type: this.type,
            objType: this.objType,
            name: this.name,
            id: this.id,
            projectionMatrix: this.projectionMatrix
        }
        return obj
    }

    setData(obj: ObjectData) {
        this.pos = obj.pos
        this.anchorPoint = obj.anchorPoint
        this.rotation = obj.rotation
        this.scale = obj.scale
        this.color = obj.color
        this.originalColor = obj.originalColor
        this.va = obj.va
        this.ia_length = obj.ia_length
        this.type = obj.type
        this.objType = obj.objType
        this.id = obj.id
        this.projectionMatrix = obj.projectionMatrix
    }

    computeAnchorPoint() {
        if (this.va && this.va.length % 2 === 0) {
            let sigmaX = 0
            let sigmaY = 0
            for (let i = 0; i < this.va.length; i += 2) {
                sigmaX += this.va[i]
                sigmaY += this.va[i+1]
            }
            this.anchorPoint = [sigmaX / (this.va.length/2), sigmaY / (this.va.length/2)]
        }
    }
    
    assignVertexArray(va: Array<number>) {
        this.va = va
        this.computeAnchorPoint()
        const [centerX, centerY] = this.anchorPoint
        const transformedVertexArray = [...this.va]
        for (let i = 0; i < transformedVertexArray.length; i += 2) {
            transformedVertexArray[i] -= centerX
            transformedVertexArray[i+1] -= centerY
        }
        this.va = transformedVertexArray
        this.pos = this.anchorPoint
        this.rotation = this.rotation || 0
        this.scale = this.scale || [1,1]
        this.projectionMatrix = this.calculateProjectionMatrix()
    }
    assignName(name: string) { this.name = name }
    assignId(id: number) { this.id = id }
    setColor(color: [number, number, number, number]) { this.color = color }
    setSelected(isSelected: boolean) {
        // isSelected ? console.log('selecting ' + this.id) : console.log('deselecting ' + this.id)
        this.isSelected = isSelected
        this.originalColor = [...this.color]
        // this.setColor([0.9, 0, 0, 1])
    }
    deselect() {
        this.isSelected = false
        // if (this.originalColor) this.color = [...this.originalColor]
    }

    calculateProjectionMatrix(): number[] {
        if (!(this.va || this.pos || this.rotation || this.scale)) return null
        const positionMatrix = [
            1, 0, 0,
            0, 1, 0,
            this.pos[0], this.pos[1], 1
        ]
        // rotate
        const rad = this.rotation * Math.PI / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const rotationMatrix = [
            cos, -sin, 0,
            sin, cos, 0,
            0, 0, 1
        ]
        // scale
        const scaleMatrix = [
            this.scale[0], 0, 0,
            0, this.scale[1], 0,
            0, 0, 1
        ]
        const rotated = multiplyMatrix(rotationMatrix, scaleMatrix)
        const translated = multiplyMatrix(rotated, positionMatrix)
        return translated
    }

    move(x: number, y:number) {
        this.pos = [x,y]
        this.projectionMatrix = this.calculateProjectionMatrix()
    }

    moveVertex(idx: number, x: number, y: number) {
        this.va[idx*2] = x - this.pos[0]
        this.va[idx*2+1] = y - this.pos[1]
        this.computeAnchorPoint()
        const [centerX, centerY] = this.anchorPoint
        const transformedVertexArray = [...this.va]
        for (let i = 0; i < transformedVertexArray.length; i += 2) {
            transformedVertexArray[i] -= centerX
            transformedVertexArray[i+1] -= centerY
        }
        this.va = transformedVertexArray
        this.pos[0] += this.anchorPoint[0]
        this.pos[1] += this.anchorPoint[1]
        this.projectionMatrix = this.calculateProjectionMatrix()
    }

    rotate(deg: number) {
        this.rotation = deg
        this.projectionMatrix = this.calculateProjectionMatrix()
    }

    scaling(x: number, y: number) {
        this.scale = [x,y]
        this.projectionMatrix = this.calculateProjectionMatrix()
    }

    coloring(r: number, g: number, b: number, a:number) {
        this.setColor([r,g,b,a]);
    }
    
    bind() {
        const gl = this.gl
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.va), gl.STATIC_DRAW)
        this.vab = buf
        const indexBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
        const indices = []
        if (this.type != gl.LINES) {
            for (let i = 2; i < this.va.length/2; i++) {
                indices.push(i-1)
                indices.push(i)
                indices.push(0)
            }
        } else {
            indices.push(0)
            indices.push(1)
        }
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
        this.ia_length = indices.length

    }
    

    draw(withProgram?: WebGLProgram) {
        this.bind()
        const program = withProgram || this.shader
        const gl = this.gl
        gl.useProgram(program)
        const vertexPos = gl.getAttribLocation(program, 'attrib_vertexPos')
        const uniformCol = gl.getUniformLocation(program, 'u_fragColor')
        const uniformPos = gl.getUniformLocation(program, 'u_pos')
        gl.uniformMatrix3fv(uniformPos, false, this.projectionMatrix)
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
        gl.drawElements(this.type, this.ia_length, gl.UNSIGNED_SHORT, 0)
    }

    drawSelect(selectProgram: WebGLProgram) {
        this.bind()
        const gl = this.gl
        const id = this.id
        gl.useProgram(selectProgram)
        const vertexPos = gl.getAttribLocation(selectProgram, 'a_Pos')
        const uniformCol = gl.getUniformLocation(selectProgram, 'u_id')
        const uniformPos = gl.getUniformLocation(selectProgram, 'u_pos')
        gl.uniformMatrix3fv(uniformPos, false, this.projectionMatrix)
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
        gl.drawElements(this.type, this.ia_length, gl.UNSIGNED_SHORT, 0)
    }

    drawPoint(vertPointProgram: WebGLProgram) {
        this.bind()
        const program = vertPointProgram
        const gl = this.gl
        gl.useProgram(program)
        const vertexPos = gl.getAttribLocation(program, 'a_Pos')
        const uniformCol = gl.getUniformLocation(program, 'u_fragColor')
        const uniformPos = gl.getUniformLocation(program, 'u_pos')
        const resolutionPos = gl.getUniformLocation(program, 'u_resolution')
        gl.uniformMatrix3fv(uniformPos, false, this.projectionMatrix)
        gl.vertexAttribPointer(
            vertexPos,
            2, // it's 2 dimensional
            gl.FLOAT,
            false,
            0,
            0
        )
        gl.uniform2f(resolutionPos, gl.canvas.width, gl.canvas.height)
        gl.enableVertexAttribArray(vertexPos)
        if (this.color) {
            gl.uniform4fv(uniformCol, this.color)
        }
        gl.uniform4fv(uniformCol, [0.0, 0.0, 1.0, 1.0])
        if (this.ia_length > 3) {
            gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, 2)
            gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, 4)
            gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, 0)
            for (let i = 3; i < this.ia_length; i+=3) {
                gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, (i+1)*2)
            }
        } else {
            gl.drawElements(gl.POINTS, 2, gl.UNSIGNED_SHORT, 0)
        }
    }

    drawPointSelect(selectProgram: WebGLProgram) {
        this.bind()
        const gl = this.gl
        gl.useProgram(selectProgram)
        const vertexPos = gl.getAttribLocation(selectProgram, 'a_Pos')
        const uniformCol = gl.getUniformLocation(selectProgram, 'u_id')
        const uniformPos = gl.getUniformLocation(selectProgram, 'u_pos')
        const resolutionPos = gl.getUniformLocation(selectProgram, 'u_resolution')
        gl.uniformMatrix3fv(uniformPos, false, this.projectionMatrix)
        gl.vertexAttribPointer(
            vertexPos,
            2, // it's 2 dimensional
            gl.FLOAT,
            false,
            0,
            0
        )
        gl.enableVertexAttribArray(vertexPos)
        gl.uniform2f(resolutionPos, gl.canvas.width, gl.canvas.height)
        if (this.ia_length > 3) {
            gl.uniform4fv(uniformCol, setElementId(2))
            gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, 0)
            gl.uniform4fv(uniformCol, setElementId(3))
            gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, 2)
            gl.uniform4fv(uniformCol, setElementId(1))
            gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, 4)
            let lastVertId = 4
            for (let i = 3; i < this.ia_length; i+=3) {
                gl.uniform4fv(uniformCol, setElementId(lastVertId))
                gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, (i+1)*2)
                lastVertId++
            }
        } else {
            gl.uniform4fv(uniformCol, setElementId(1))
            gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, 0)
            gl.uniform4fv(uniformCol, setElementId(2))
            gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, 2)
        }        
    }
}

function setElementId(id: number) {
    const uniformId = [
        ((id >> 0) & 0xFF) / 0xFF,
        ((id >> 8) & 0xFF) / 0xFF,
        ((id >> 16) & 0xFF) / 0xFF,
        0x69,
    ]
    return uniformId
}

export default CADObject