import { ProgramInfo, ObjectType, AppState } from './interfaces';
import { init, initShader, screenToClipSpace, recalcPosBuf, initShaderFiles } from './renderer/utils'
import ObjectManager from './objects/manager'
import CADObject from './objects/CADObject'

let shaders: WebGLProgram = null;
let mousePos: [number, number] = [0,0];
let vab = []
let appState: AppState = AppState.Selecting
let drawingContext = null;
let vertexLeft = 0;
let mouseHoverObjId = 0;
let lastSelectedObjId = -1
let totalObj = 0


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
    appState = AppState.Drawing
    drawingContext = ObjectType.Line
    vertexLeft = 2;
}

function drawRect() {
    appState = AppState.Drawing
    drawingContext = ObjectType.Rect
    vertexLeft = 2;
}

function drawQuad() {
    appState = AppState.Drawing
    drawingContext = ObjectType.Quad
    vertexLeft = 4
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
    programInfo.shaderProgram = await initShader(gl)
    programInfo.pickProgram = await initShaderFiles(gl, 'select_vert.glsl', 'select_frag.glsl')
    let objectManager: ObjectManager = new ObjectManager(programInfo.pickProgram)

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
        // draw tex
        drawTex(gl, programInfo, objectManager)
        // get hovered id
        const pixelX = mousePos[0] * gl.canvas.width / canvas.clientWidth
        const pixelY = gl.canvas.height - mousePos[1] * gl.canvas.height / canvas.clientHeight - 1
        const data = new Uint8Array(4)
        gl.readPixels(pixelX, pixelY, 1,1, gl.RGBA, gl.UNSIGNED_BYTE, data)
        const id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24)
        mouseHoverObjId = id

        // draw objects, clear framebuffer first
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        if (appState === AppState.Drawing) {
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
    gl.useProgram(shaderProgram)
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.posBuf)
    const vertexPos = gl.getAttribLocation(shaderProgram, 'attrib_vertexPos')
    gl.vertexAttribPointer(vertexPos, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(vertexPos)    
    const uniformcCol = gl.getUniformLocation(shaderProgram, 'u_fragColor')
    gl.uniform4f(uniformcCol, 0.5, 0.5, 0, 1)
    if (drawingContext === ObjectType.Quad) {
        gl.drawArrays(gl.LINE_STRIP, 0, vab.length/2 + 1)
    } else {
        gl.drawArrays(gl.LINES, 0, vab.length/2 + 1)
    }   
}

function drawTex(gl: WebGL2RenderingContext, programInfo: ProgramInfo, objManager: ObjectManager) {
    const { frameBuf } = programInfo.buffers
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuf)
    // gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    objManager.renderTex()
}

// event handler
function clickEvent(gl: WebGL2RenderingContext, event, objectManager: ObjectManager, programInfo: ProgramInfo) {
    if (appState === AppState.Drawing) {
        const position = [
            event.pageX - event.target.offsetLeft,
            gl.drawingBufferHeight - (event.pageY - event.target.offsetTop)
        ]
        const clipPos = screenToClipSpace(position[0], position[1], gl)
        vab.push(clipPos[0])
        vab.push(clipPos[1])
        vertexLeft--
        if (vertexLeft == 0) {
            appState = AppState.Selecting
            if (drawingContext === ObjectType.Line) {
                const cadObj = new CADObject(gl.LINES, programInfo.shaderProgram, gl, ObjectType.Line)
                cadObj.assignVertexArray([...vab])
                cadObj.assignId(totalObj + 1)
                cadObj.bind()
                objectManager.addObject(cadObj)
                totalObj++
                console.log('object added with id ' + totalObj)
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
                cadObj.assignId(totalObj + 1)
                cadObj.bind()
                objectManager.addObject(cadObj)
                totalObj++
                console.log('object added with id ' + totalObj)
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
                cadObj.assignId(totalObj + 1)
                cadObj.bind()
                objectManager.addObject(cadObj)
                totalObj++
                console.log('object added with id ' + totalObj)
            }
            vab.length = 0
        }
    } else if (appState === AppState.Selecting) {
        lastSelectedObjId = mouseHoverObjId
        if (lastSelectedObjId > 0) {
            objectManager.getObject(lastSelectedObjId).setSelected(true)
            document.getElementById('sel-id').innerText = lastSelectedObjId.toString()
        } else {
            objectManager.deselectAll()
            document.getElementById('sel-id').innerText = 'none selected'
        }
    }
}


function printMousePos(canvas: HTMLCanvasElement, event) {
    const {x,y} = getMousePosition(canvas, event)
    document.getElementById('x-pos').innerText = x.toString()
    document.getElementById('y-pos').innerText = y.toString()
    document.getElementById('obj-id').innerText = mouseHoverObjId > 0 ? mouseHoverObjId.toString() : 'none'
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



