import { ProgramInfo, ObjectType } from './interfaces';
import { init, initShader, screenToClipSpace, recalcPosBuf } from './renderer/utils'
import ObjectManager from './objects/manager'
import CADObject from './objects/CADObject'

let shaders: WebGLProgram = null;
let mousePos: [number, number] = [0,0];
let vab = []
let isDrawing = false;
let drawingContext = null;
let vertexLeft = 0;

function setupUI() {
    const drawLineButton = document.getElementById('draw-line') as HTMLButtonElement
    const drawRectButton = document.getElementById('draw-rect') as HTMLButtonElement
    const drawQuadButton = document.getElementById('draw-quad') as HTMLButtonElement
    
    drawLineButton.addEventListener('click', () => {
        drawLine()
    })
    drawRectButton.addEventListener('click', () => {
        drawRect()
    })
    drawQuadButton.addEventListener('click', () => {
        drawQuad()
    })
}

function drawLine() {
    isDrawing = true;
    drawingContext = ObjectType.Line
    vertexLeft = 2;
}

function drawRect() {
    isDrawing = true;
    drawingContext = ObjectType.Rect
    vertexLeft = 2;
}

function drawQuad() {
    isDrawing = true
    drawingContext = ObjectType.Quad
    vertexLeft = 4
}

async function getShader(gl: WebGL2RenderingContext) {
    if (shaders == null) {
        shaders = await initShader(gl)
        console.log('shaders initialized')
    }
    return shaders
}

function getShaderSync(gl: WebGL2RenderingContext) {
    return shaders
}

async function main() {
    setupUI()
    const canvas = document.getElementById('content') as HTMLCanvasElement
    canvas.width = window.innerWidth - 200
    canvas.height = window.innerHeight
    const gl = canvas.getContext('webgl2')
    if (!gl) {
        alert('WebGL is not supported on this browser/device')
        return
    }

    let programInfo: ProgramInfo = {};
    let objectManager: ObjectManager = new ObjectManager()
    programInfo.shaderProgram = await initShader(gl)

    canvas.addEventListener('mousemove', (event) => {
        printMousePos(canvas, event)
    }, false)
    canvas.addEventListener('click', (event) => {
        clickEvent(gl, event, objectManager, programInfo)
    }, false)
    

    // render block
    var then = 0;
    init(gl, programInfo, vab)
    function render(now) {
        now *= 0.001
        const deltatime = now - then
        gl.clearColor(1,1,1,1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        if (isDrawing) {
            recalcPosBuf(gl, programInfo, vab, mousePos)
            drawScene(gl, programInfo)
        }
        objectManager.render()
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)


}

function drawScene(gl: WebGL2RenderingContext, programInfo) {
    const shaderProgram = programInfo.shaderProgram
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.posBuf)
    const vertexPos = gl.getAttribLocation(shaderProgram, 'attrib_vertexPos')
    gl.vertexAttribPointer(vertexPos, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(vertexPos)    
    const uniformcCol = gl.getUniformLocation(shaderProgram, 'u_fragColor')
    gl.uniform4f(uniformcCol, 0.5, 0.5, 0, 1)
    gl.useProgram(shaderProgram)
    if (drawingContext === ObjectType.Quad) {
        gl.drawArrays(gl.LINE_STRIP, 0, vab.length/2 + 1)
    } else {
        gl.drawArrays(gl.LINES, 0, vab.length/2 + 1)
    }
}

// event handler
function clickEvent(gl: WebGL2RenderingContext, event, objectManager: ObjectManager, programInfo: ProgramInfo) {
    console.log(vab)
    console.log(isDrawing, vertexLeft)
    if (isDrawing) {
        const position = [
            event.pageX - event.target.offsetLeft,
            gl.drawingBufferHeight - (event.pageY - event.target.offsetTop)
        ]
        const clipPos = screenToClipSpace(position[0], position[1], gl)
        vab.push(clipPos[0])
        vab.push(clipPos[1])
        console.log(vab)
        vertexLeft--
        if (vertexLeft == 0) {
            isDrawing = false
            // save current object
            if (drawingContext === ObjectType.Line) {
                const cadObj = new CADObject(gl.LINES, programInfo.shaderProgram, gl, ObjectType.Line)
                cadObj.assignVertexArray([...vab])
                cadObj.bind()
                objectManager.addObject(cadObj)
                console.log('object added')
            } else if (drawingContext === ObjectType.Rect) {
                const cadObj = new CADObject(gl.TRIANGLES, programInfo.shaderProgram, gl, ObjectType.Rect)
                const deltaX = vab[2] - vab[0]
                const deltaY = vab[3] - vab[1]
                const localVab = [
                    vab[0], vab[1],
                    vab[0] + deltaX, vab[1],
                    vab[0], vab[1] + deltaY,
                    vab[0] + deltaX, vab[1],
                    vab[0], vab[1] + deltaY,
                    vab[2], vab[3]
                ]
                cadObj.assignVertexArray(localVab)
                cadObj.bind()
                objectManager.addObject(cadObj)
                console.log('rect added')
            } else if (drawingContext === ObjectType.Quad) {
                const cadObj = new CADObject(gl.TRIANGLES, programInfo.shaderProgram, gl, ObjectType.Quad)
                const localVab = [
                    vab[0], vab[1],
                    vab[2], vab[3],
                    vab[4], vab[5],
                    vab[4], vab[5],
                    vab[6], vab[7],
                    vab[0], vab[1] 
                ]
                cadObj.assignVertexArray(localVab)
                cadObj.bind()
                objectManager.addObject(cadObj)
                console.log('quad added')
            }
            vab.length = 0
        }
    }
}


function printMousePos(canvas: HTMLCanvasElement, event) {
    const {x,y} = getMousePosition(canvas, event)
    document.getElementById('x-pos').innerText = x.toString()
    document.getElementById('y-pos').innerText = y.toString()
    mousePos = [x,y]
}



function getMousePosition(canvas: HTMLCanvasElement, event) {
    const bound = canvas.getBoundingClientRect()
    return {
        x: event.clientX - bound.left,
        y: event.clientY - bound.top
    }
}


main()



