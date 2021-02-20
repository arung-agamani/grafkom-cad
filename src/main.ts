import { ProgramInfo, ObjectType, AppState } from './interfaces';
import { init, initShader, screenToClipSpace, recalcPosBuf, initShaderFiles } from './renderer/utils'
import ObjectManager from './objects/manager'
import CADObject from './objects/CADObject'

let shaders: WebGLProgram = null;
let mousePos: [number, number] = [0,0];
let mousePosVertNormalized: [number, number] = [0,0];
let vab = []
let appState: AppState = AppState.Selecting
let drawingContext = null;
let vertexLeft = 0;
let mouseHoverObjId = 0;
let previouslySelectedObjId = -1
let lastSelectedObjId = -1
let totalObj = 0
let isMouseDown = false;


function setupUI(objectManger: ObjectManager) {
    const drawLineButton = document.getElementById('draw-line') as HTMLButtonElement
    const drawRectButton = document.getElementById('draw-rect') as HTMLButtonElement
    const drawQuadButton = document.getElementById('draw-quad') as HTMLButtonElement
    const xPosInput = document.getElementById('x-pos-range') as HTMLInputElement
    const yPosInput = document.getElementById('y-pos-range') as HTMLInputElement
    const rotInput = document.getElementById('rot-input') as HTMLInputElement
    const xScaleInput = document.getElementById('x-scale-input') as HTMLInputElement
    const yScaleInput = document.getElementById('y-scale-input') as HTMLInputElement
    const selectButton = document.getElementById('select-button') as HTMLInputElement
    const moveButton = document.getElementById('move-button') as HTMLInputElement
    const rotateButton = document.getElementById('rotate-button') as HTMLInputElement
    const scaleButton = document.getElementById('scale-button') as HTMLInputElement
    
    drawLineButton.addEventListener('click', () => {
        drawLine()
    })
    drawRectButton.addEventListener('click', () => {
        drawRect()
    })
    drawQuadButton.addEventListener('click', () => {
        drawQuad()
    })

    selectButton.addEventListener('click', () => {
        appState = AppState.Selecting
    })
    moveButton.addEventListener('click', () => {
        appState = AppState.Moving
    })
    rotateButton.addEventListener('click', () => {
        appState = AppState.Rotating
    })
    scaleButton.addEventListener('click', () => {
        appState = AppState.Scaling
    })



    xPosInput.addEventListener('input', () => {
        if (lastSelectedObjId > 0) {
            const obj = objectManger.getObject(lastSelectedObjId);
            const [xPos, yPos] = obj.pos;
            const [x, y] = [parseInt(xPosInput.value), parseInt(yPosInput.value)]
            obj.move(x,y)
            document.getElementById('x-pos-val').innerText = xPos.toString()
            document.getElementById('y-pos-val').innerText = yPos.toString()
        }        
    })
    yPosInput.addEventListener('input', () => {
        if (lastSelectedObjId > 0) {
            const obj = objectManger.getObject(lastSelectedObjId)
            const [xPos, yPos] = obj.pos;
            const [x, y] = [parseInt(xPosInput.value), parseInt(yPosInput.value)]
            obj.move(x,y)
            document.getElementById('x-pos-val').innerText = xPos.toString()
            document.getElementById('y-pos-val').innerText = yPos.toString()
        }
    })
    rotInput.addEventListener('change', () => {
        if (lastSelectedObjId > 0) {
            const obj = objectManger.getObject(lastSelectedObjId)
            obj.rotate(parseInt(rotInput.value))
        }
    })
    xScaleInput.addEventListener('change', () => {
        if (lastSelectedObjId > 0) {
            const obj = objectManger.getObject(lastSelectedObjId)
            const [x,y] = [parseInt(xScaleInput.value), parseInt(yScaleInput.value)]
            obj.scaling(x,y)
        }
    })
    yScaleInput.addEventListener('change', () => {
        if (lastSelectedObjId > 0) {
            const obj = objectManger.getObject(lastSelectedObjId)
            const [x,y] = [parseInt(xScaleInput.value), parseInt(yScaleInput.value)]
            obj.scaling(x,y)
        }
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
    const canvas = document.getElementById('content') as HTMLCanvasElement
    canvas.width = window.innerWidth - 200
    canvas.height = window.innerHeight
    const gl = canvas.getContext('webgl2')
    if (!gl) {
        alert('WebGL is not supported on this browser/device')
        return
    }
    
    let programInfo: ProgramInfo = {};
    programInfo.shaderProgram = await initShaderFiles(gl, 'draw_vert.glsl', 'draw_frag.glsl')
    programInfo.pickProgram = await initShaderFiles(gl, 'select_vert.glsl', 'select_frag.glsl')
    programInfo.vertPointProgram = await initShaderFiles(gl, 'point_vert.glsl', 'point_frag.glsl')
    programInfo.vertSelectProgram = await initShaderFiles(gl, 'point_vert.glsl', 'selectPoint_frag.glsl')
    let objectManager: ObjectManager = new ObjectManager(programInfo.pickProgram)
    
    setupUI(objectManager)

    canvas.addEventListener('mousemove', (event) => {
        printMousePos(canvas, event, gl)
        dragEvent(gl, event, objectManager, programInfo)
    }, false)
    canvas.addEventListener('click', (event) => {
        clickEvent(gl, event, objectManager, programInfo)
    }, false)
    canvas.addEventListener('mousedown', () => {
        isMouseDown = true
    })
    canvas.addEventListener('mouseup', () => {
        isMouseDown = false
    })

    // render block
    var then = 0;
    init(gl, programInfo, vab)
    function render(now) {
        now *= 0.001
        const deltatime = now - then
        gl.clearColor(0,0,0,1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.viewport(0,0, gl.canvas.width, gl.canvas.height)
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
            recalcPosBuf(gl, programInfo, vab, mousePosVertNormalized)
            drawScene(gl, programInfo)
        }

        objectManager.render(programInfo)
        // objectManager.renderPoint(programInfo.vertPointProgram)
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}

function drawScene(gl: WebGL2RenderingContext, programInfo) {
    const shaderProgram = programInfo.shaderProgram
    gl.useProgram(shaderProgram)
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.posBuf)
    const vertexPos = gl.getAttribLocation(shaderProgram, 'attrib_vertexPos')
    const resolutionPos = gl.getUniformLocation(shaderProgram, 'u_resolution')
    const uniformPos = gl.getUniformLocation(shaderProgram, 'u_pos')
    const identityMatrix = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]
    gl.uniform2f(resolutionPos, gl.canvas.width, gl.canvas.height)
    gl.uniformMatrix3fv(uniformPos, false, identityMatrix)
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
    gl.useProgram(programInfo.pickProgram)
    const resolutionPos = gl.getUniformLocation(programInfo.pickProgram, 'u_resolution')
    gl.uniform2f(resolutionPos, gl.canvas.width, gl.canvas.height)
    objManager.renderTex()
}

// event handler
function clickEvent(gl: WebGL2RenderingContext, event, objectManager: ObjectManager, programInfo: ProgramInfo) {
    if (appState === AppState.Drawing) {
        const position = [
            event.pageX - event.target.offsetLeft,
            gl.drawingBufferHeight - (event.pageY - event.target.offsetTop)
        ]
        vab.push(position[0])
        vab.push(position[1])
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
        previouslySelectedObjId = lastSelectedObjId
        lastSelectedObjId = mouseHoverObjId
        if (lastSelectedObjId > 0 && lastSelectedObjId != previouslySelectedObjId) {
            objectManager.getObject(previouslySelectedObjId)?.deselect()
            const obj = objectManager.getObject(lastSelectedObjId)
            obj.setSelected(true)
            const [xPos, yPos] = obj.pos
            const [rot, xScale, yScale] = [obj.rotation, ...obj.scale]
            document.getElementById('sel-id').innerText = lastSelectedObjId.toString()
            document.getElementById('x-pos-val').innerText = xPos.toString()
            document.getElementById('y-pos-val').innerText = yPos.toString();
            (document.getElementById('x-pos-range') as HTMLInputElement).value = xPos.toString();
            (document.getElementById('y-pos-range') as HTMLInputElement).value = yPos.toString();
            (document.getElementById('rot-input') as HTMLInputElement).value = rot.toString();
            (document.getElementById('x-scale-input') as HTMLInputElement).value = xScale.toString();
            (document.getElementById('y-scale-input') as HTMLInputElement).value = yScale.toString();
        } else {
            objectManager.deselectAll()
            document.getElementById('sel-id').innerText = 'none selected'
        }
    }
}

function dragEvent(gl: WebGL2RenderingContext, event, objectManager: ObjectManager, programInfo: ProgramInfo) {
    if (appState === AppState.Moving && isMouseDown) {
        const position = [
            event.pageX - event.target.offsetLeft,
            gl.drawingBufferHeight - (event.pageY - event.target.offsetTop)
        ]
        const obj = objectManager.getObject(lastSelectedObjId)
        if (!obj) return;
        obj.move(position[0], position[1])
    }
}


function printMousePos(canvas: HTMLCanvasElement, event, gl: WebGL2RenderingContext) {
    const position = [
        event.pageX - event.target.offsetLeft,
        gl.drawingBufferHeight - (event.pageY - event.target.offsetTop)
    ]
    const {x,y} = getMousePosition(canvas, event)
    document.getElementById('x-pos').innerText = x.toString()
    document.getElementById('y-pos').innerText = y.toString()
    document.getElementById('obj-id').innerText = mouseHoverObjId > 0 ? mouseHoverObjId.toString() : 'none'
    mousePos = [x,y]
    mousePosVertNormalized = [position[0], position[1]]
}
function getMousePosition(canvas: HTMLCanvasElement, event) {
    const bound = canvas.getBoundingClientRect()
    return {
        x: event.clientX - bound.left,
        y: event.clientY - bound.top
    }
}


main()



