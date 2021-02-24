export interface ProgramInfo {
    shaderProgram?: WebGLProgram;
    pickProgram?: WebGLProgram;
    vertPointProgram?: WebGLProgram;
    vertSelectProgram?: WebGLProgram;
    buffers?: Buffers;
}

export interface Buffers {
    posBuf?: any;
    colBuf?: any;
    texBuf?: WebGLTexture;
    depBuf?: WebGLRenderbuffer;
    frameBuf?: WebGLFramebuffer;
}

export enum ObjectType {
    Point,
    Line,
    Rect,
    Quad,
    Poly
}

export enum AppState {
    Drawing,
    Selecting,
    Moving,
    Rotating,
    Scaling
}