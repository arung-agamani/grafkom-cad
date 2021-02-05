export interface ProgramInfo {
    shaderProgram?: WebGLProgram;
    buffers?: Buffers;
}

export interface Buffers {
    posBuf?: any;
    colBuf?: any;
}

export enum ObjectType {
    Point,
    Line,
    Rect,
    Quad
}