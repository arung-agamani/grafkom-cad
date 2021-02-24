import { ProgramInfo, ObjectType, AppState, ObjectData, AppData } from './interfaces';
import { init, initShader, download, recalcPosBuf, initShaderFiles } from './renderer/utils'
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
let mouseHoverVertId = -1;
let previouslySelectedObjId = -1
let lastSelectedObjId = -1
let lastSelectedVertId = -1
let totalObj = 0
let isMouseDown = false;

let programInfo: ProgramInfo = {};
let glReference: WebGL2RenderingContext;

let loadFileInput = null;


function setupUI(objectManger: ObjectManager) {
    const drawLineButton = document.getElementById('draw-line') as HTMLButtonElement
    const drawRectButton = document.getElementById('draw-rect') as HTMLButtonElement
    const drawQuadButton = document.getElementById('draw-quad') as HTMLButtonElement
    const drawPolyButton = document.getElementById('draw-poly') as HTMLButtonElement
    const loadButton = document.getElementById('load-button') as HTMLButtonElement
    const saveButton = document.getElementById('save-button') as HTMLButtonElement
    const xPosInput = document.getElementById('x-pos-range') as HTMLInputElement
    const yPosInput = document.getElementById('y-pos-range') as HTMLInputElement
    const rotInput = document.getElementById('rot-input') as HTMLInputElement
    const xScaleInput = document.getElementById('x-scale-input') as HTMLInputElement
    const yScaleInput = document.getElementById('y-scale-input') as HTMLInputElement
    const selectButton = document.getElementById('select-button') as HTMLInputElement
    const moveButton = document.getElementById('move-button') as HTMLInputElement
    const rotateButton = document.getElementById('rotate-button') as HTMLInputElement
    const scaleButton = document.getElementById('scale-button') as HTMLInputElement
    const colorInput = document.getElementById('col-picker') as HTMLInputElement

    drawLineButton.addEventListener('click', () => {
        drawLine()
    })
    drawRectButton.addEventListener('click', () => {
        drawRect()
    })
    drawQuadButton.addEventListener('click', () => {
        drawQuad()
    })
    drawPolyButton.addEventListener('click', () => {
        drawPoly()
    })

    loadButton.addEventListener('click', () => {
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.style.display = 'none'
        const readFile = (e) => {
            const file = e.target.files[0]
            if (!file) {
                document.body.removeChild(loadFileInput)
                loadFileInput = null
                return
            }
            const fileReader = new FileReader()
            fileReader.onload = (evt) => {
                const content = evt.target.result as string
                const parsed = JSON.parse(content) as AppData
                objectManger.load(parsed.objectData, programInfo.shaderProgram, glReference)
                document.body.removeChild(loadFileInput)
                loadFileInput = null
                drawScene(glReference, programInfo)
            }
            fileReader.readAsText(file)
        }
        fileInput.onchange = readFile
        document.body.appendChild(fileInput)
        loadFileInput = fileInput
        fileInput.click()
        
    })
    saveButton.addEventListener('click', () => {
        const data: ObjectData[] = objectManger.getAllObjectData()
        const fileContent: AppData = {
            createdAt: new Date(),
            objectData: data
        }
        download(JSON.stringify(fileContent), "awoocad-data.json", "application/json")
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
            //const [x,y] = [parseInt(xScaleInput.value), parseInt(yScaleInput.value)]
            const [x,y] = [parseFloat(xScaleInput.value), parseFloat(yScaleInput.value)]
            obj.scaling(x,y)
        }
    })
    yScaleInput.addEventListener('change', () => {
        if (lastSelectedObjId > 0) {
            const obj = objectManger.getObject(lastSelectedObjId)
            //const [x,y] = [parseInt(xScaleInput.value), parseInt(yScaleInput.value)]
            const [x,y] = [parseFloat(xScaleInput.value), parseFloat(yScaleInput.value)]
            obj.scaling(x,y)
        }
    })

    colorInput.addEventListener('input', () => {
        if (lastSelectedObjId > 0) {
            const obj = objectManger.getObject(lastSelectedObjId);
            const color = hexToRgb(colorInput.value);
            obj.coloring(color.r, color.g, color.b, 1);
        }
    })
}

function hexToRgb(hex) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });
  
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16)/256,
      g: parseInt(result[2], 16)/256,
      b: parseInt(result[3], 16)/256
    } : null;
}

function rgbToHex(red, green, blue) {
    red *= 256
    green *= 256
    blue *= 256
    const rgb = (red << 16) | (green << 8) | (blue << 0);
    return '#' + (0x1000000 + rgb).toString(16).slice(1);
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

function drawPoly() {
    appState = AppState.Drawing
    drawingContext = ObjectType.Poly
    vertexLeft = 999
}


async function main() {
    const canvas = document.getElementById('content') as HTMLCanvasElement
    canvas.width = window.innerWidth*0.8
    canvas.height = window.innerHeight
    const gl = canvas.getContext('webgl2')
    glReference = gl
    if (!gl) {
        alert('WebGL is not supported on this browser/device')
        return
    }
    
    
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
        if (appState === AppState.Moving) {
            if (mouseHoverVertId > 0)
                lastSelectedVertId = mouseHoverVertId
            document.getElementById('vsel-id').innerText = lastSelectedVertId.toString()
        }
    })
    canvas.addEventListener('mouseup', () => {
        isMouseDown = false
    })
    document.addEventListener('keydown', (event) => {
        if (appState === AppState.Drawing && drawingContext === ObjectType.Poly && event.key === 'Enter') {
            console.log("Enter pressed")
            onKeyEnterEvent(gl, event, objectManager, programInfo)
        }
    })

    // render block
    var then = 0;
    init(gl, programInfo, vab)
    function render(now) {
        now *= 0.001
        const deltatime = now - then
        gl.clearColor(1,1,1,1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.viewport(0,0, gl.canvas.width, gl.canvas.height)
        // draw tex
        drawTex(gl, programInfo, objectManager)
        // get hovered id
        const pixelX = mousePos[0] * gl.canvas.width / canvas.clientWidth
        const pixelY = gl.canvas.height - mousePos[1] * gl.canvas.height / canvas.clientHeight - 1
        const data = new Uint8Array(4)
        gl.readPixels(pixelX, pixelY, 1,1, gl.RGBA, gl.UNSIGNED_BYTE, data)
        if (data[3] === 0xFF && (data[2] != 0xFF && data[1] != 0xFF, data[0] != 0xFF)) {
            const id = data[0] + (data[1] << 8) + (data[2] << 16)
            mouseHoverVertId = id
        } else {
            mouseHoverVertId = -1
        }
        if (data[3] === 0x00) {
            const id = data[0] + (data[1] << 8) + (data[2] << 16)
            mouseHoverObjId = id
        }
        
        
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
    if (drawingContext === ObjectType.Quad || drawingContext === ObjectType.Poly) {
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
    objManager.renderTex(programInfo)
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
            } else if (drawingContext === ObjectType.Rect) {
                const cadObj = new CADObject(gl.TRIANGLES, programInfo.shaderProgram, gl, ObjectType.Rect)
                const deltaX = vab[2] - vab[0]
                const deltaY = vab[3] - vab[1]
                const localVab = [
                    vab[0], vab[1],
                    vab[0], vab[1] + deltaY,
                    vab[2], vab[3],
                    vab[0] + deltaX, vab[1],
                ]
                cadObj.assignVertexArray(localVab)
                cadObj.assignId(totalObj + 1)
                cadObj.bind()
                objectManager.addObject(cadObj)
                totalObj++
            } else if (drawingContext === ObjectType.Quad) {
                const cadObj = new CADObject(gl.TRIANGLES, programInfo.shaderProgram, gl, ObjectType.Quad)
                const localVab = [
                    vab[0], vab[1],
                    vab[2], vab[3],
                    vab[4], vab[5],
                    vab[6], vab[7]
                ]
                cadObj.assignVertexArray(localVab)
                cadObj.assignId(totalObj + 1)
                cadObj.bind()
                objectManager.addObject(cadObj)
                totalObj++
            } else if (drawingContext === ObjectType.Poly) {
                const cadObj = new CADObject(gl.TRIANGLES, programInfo.shaderProgram, gl, ObjectType.Poly)
                cadObj.assignVertexArray([...vab])
                cadObj.assignId(totalObj + 1)
                cadObj.bind()
                objectManager.addObject(cadObj)
                totalObj++
                console.log('poly created')
            }
            vab.length = 0
        }
    } else if (appState === AppState.Selecting) {
        previouslySelectedObjId = lastSelectedObjId
        lastSelectedObjId = mouseHoverObjId
        if (lastSelectedObjId != 0 && lastSelectedObjId != previouslySelectedObjId) {
            objectManager.getObject(previouslySelectedObjId)?.deselect()
            const obj = objectManager.getObject(lastSelectedObjId)
            if (!obj) return
            obj.setSelected(true)
            const [xPos, yPos] = obj.pos
            const [rot, xScale, yScale] = [obj.rotation, ...obj.scale]
            const color = rgbToHex(obj.color[0], obj.color[1], obj.color[2])
            document.getElementById('sel-id').innerText = lastSelectedObjId.toString()
            document.getElementById('x-pos-val').innerText = xPos.toString()
            document.getElementById('y-pos-val').innerText = yPos.toString();
            (document.getElementById('x-pos-range') as HTMLInputElement).value = xPos.toString();
            (document.getElementById('y-pos-range') as HTMLInputElement).value = yPos.toString();
            (document.getElementById('rot-input') as HTMLInputElement).value = rot.toString();
            (document.getElementById('x-scale-input') as HTMLInputElement).value = xScale.toString();
            (document.getElementById('y-scale-input') as HTMLInputElement).value = yScale.toString();
            (document.getElementById('col-picker') as HTMLInputElement).value = color;
        } else {
            objectManager.deselectAll()
            previouslySelectedObjId = -1
            document.getElementById('sel-id').innerText = 'none'
        }
    }
}

function onKeyEnterEvent(gl: WebGL2RenderingContext, event, objectManager: ObjectManager, programInfo: ProgramInfo) {
    vertexLeft = 0
    appState = AppState.Selecting
    const cadObj = new CADObject(gl.TRIANGLES, programInfo.shaderProgram, gl, ObjectType.Poly)
    cadObj.assignVertexArray([...vab])
    cadObj.assignId(totalObj + 1)
    cadObj.bind()
    objectManager.addObject(cadObj)
    totalObj++
    console.log('poly created')
    vab.length = 0
}

function dragEvent(gl: WebGL2RenderingContext, event, objectManager: ObjectManager, programInfo: ProgramInfo) {
    if (appState === AppState.Moving && isMouseDown) {
        const position = [
            event.pageX - event.target.offsetLeft,
            gl.drawingBufferHeight - (event.pageY - event.target.offsetTop)
        ]
        const obj = objectManager.getObject(lastSelectedObjId)
        if (!obj) return;
        if (lastSelectedVertId > 0 && mouseHoverVertId > 0) {
            obj.moveVertex(lastSelectedVertId - 1, position[0], position[1])
        } else {
            obj.move(position[0], position[1])
        }
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
    document.getElementById('vert-id').innerText = mouseHoverVertId != -1 ? mouseHoverVertId.toString() : 'none'
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



