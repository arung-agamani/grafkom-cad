import { loadShader } from '../loaders'
import {ProgramInfo} from '../interfaces'

export function screenToClipSpace(posX: number, posY: number, gl: WebGL2RenderingContext) {
    const width = gl.canvas.width;
    const height = gl.canvas.height;
    const x = (posX - width/2) / (width/2)
    const y = (posY - height/2) / (height/2)
    return [x,y]
}

export async function initShader(gl: WebGL2RenderingContext) {
    const vs = await loadShader(gl, gl.VERTEX_SHADER, 'vs.vertexshader')
    const fs = await loadShader(gl, gl.FRAGMENT_SHADER, 'fs.fragmentshader')
    const shaderProgram = gl.createProgram()
    gl.attachShader(shaderProgram, vs)
    gl.attachShader(shaderProgram, fs)
    gl.linkProgram(shaderProgram)
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Error on initializing shader program: ' + gl.getProgramInfoLog(shaderProgram))
        return null
    }
    return shaderProgram
}

export function init(gl: WebGL2RenderingContext, programInfo: ProgramInfo, vab: Array<number>) {
    console.log('initializing...')
    const posBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vab), gl.STATIC_DRAW)
    programInfo.buffers = {
        posBuf: posBuf
    }
}

export function recalcPosBuf(gl: WebGL2RenderingContext, programInfo, vab: Array<number>, mousePos: number[]) {
    const mp = screenToClipSpace(mousePos[0], mousePos[1], gl)
    const intermediateBuf = [...vab, mp[0], -mp[1]]
    const posBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(intermediateBuf), gl.STATIC_DRAW)
    gl.deleteBuffer(programInfo.buffers.posBuf)
    programInfo.buffers.posBuf = posBuf
}