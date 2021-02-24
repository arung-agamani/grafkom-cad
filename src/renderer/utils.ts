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

export async function initShaderFiles(gl: WebGL2RenderingContext, vert: string, frag: string) {
    const vs = await loadShader(gl, gl.VERTEX_SHADER, vert)
    const fs = await loadShader(gl, gl.FRAGMENT_SHADER, frag)
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
    const posBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vab), gl.STATIC_DRAW)
    programInfo.buffers = {
        posBuf: posBuf
    }

    // texture and render buffers for picking
    const texBuf = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texBuf)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // depth buffer
    const depBuf = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, depBuf)
    function setFrameBufferAttatchmentSizes(width: number, height: number) {
        gl.bindTexture(gl.TEXTURE_2D, texBuf)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        gl.bindRenderbuffer(gl.RENDERBUFFER, depBuf)
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)
    }
    setFrameBufferAttatchmentSizes(gl.canvas.width, gl.canvas.height)

    // frame buffer
    const frameBuf = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuf)

    const attachmentPoint = gl.COLOR_ATTACHMENT0
    const lvl = 0
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texBuf, lvl)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depBuf)

    programInfo.buffers.texBuf = texBuf
    programInfo.buffers.depBuf = depBuf
    programInfo.buffers.frameBuf = frameBuf
    
}

export function recalcPosBuf(gl: WebGL2RenderingContext, programInfo, vab: Array<number>, mousePos: number[]) {
    const intermediateBuf = [...vab, mousePos[0], mousePos[1]]
    const posBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(intermediateBuf), gl.STATIC_DRAW)
    gl.deleteBuffer(programInfo.buffers.posBuf)
    programInfo.buffers.posBuf = posBuf
}

export function multiplyMatrix(matA: number[], matB: number[]): number[] {
    const out = []
    for (let i = 0; i < 3; ++i) {
        for (let j = 0; j < 3; ++j) {
            let temp = 0
            for (let k = 0; k < 3; ++k) {
                temp += matA[i*3 + k] * matB[k*3 + j]
            }
            out.push(temp)
        }
    }
    return out
}

export function addMatrix(matA: number[], matB: number[]): number[] {
    const out = []
    for (let i = 0; i < matA.length; i++) {
        out.push(matA[i] + matB[i])
    }
    return out
}


export function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}