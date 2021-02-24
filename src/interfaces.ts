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

export interface ObjectData {
    pos: [number, number];
    anchorPoint: [number, number];
    rotation: number;
    scale: [number, number];
    color: [number, number, number, number];
    originalColor: [number, number, number, number];
    ia_length: number;
    va: Array<number>;
    type: number;
    objType: number;
    name: String;
    id: number;
    projectionMatrix: Array<number>;
}

export interface AppData {
    objectData: ObjectData[];
    createdAt: Date;
}

export enum AppState {
    Drawing,
    Selecting,
    Moving,
    Rotating,
    Scaling
}