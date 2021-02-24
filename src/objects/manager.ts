import CADObject from './CADObject'
import { ObjectData, ObjectType, ProgramInfo } from '../interfaces'

class ObjectManager {
    public objectList: CADObject[];
    public lineCount = 0;
    public rectCount = 0;
    public quadCount = 0
    public idCount = 0
    public selectProgram: WebGLProgram;

    constructor(selectProgram?: WebGLProgram) {
        this.objectList = new Array<CADObject>()
        if (selectProgram) this.selectProgram = selectProgram
    }

    addObject(obj: CADObject) {
        switch (obj.objType) {
            case ObjectType.Line:
                this.lineCount++
                break
            case ObjectType.Rect:
                this.rectCount++
                break
            case ObjectType.Quad:
                this.quadCount++
                break
        }
        this.objectList.push(obj)
    }
    
    render(programInfo: ProgramInfo) {
        for (const obj of this.objectList) {
            obj.draw()
            if (obj.isSelected) obj.drawPoint(programInfo.vertPointProgram)
        }
    }

    renderTex(programInfo: ProgramInfo) {
        for (const obj of this.objectList) {
            if (obj.isSelected) {
                obj.drawPointSelect(programInfo.vertSelectProgram)
                obj.drawSelect(programInfo.pickProgram)
            } else {
                obj.drawSelect(programInfo.pickProgram)
            }
        }
    }

    renderPoint(vertPointProgram: WebGLProgram) {
        for (const obj of this.objectList) {
            obj.drawPoint(vertPointProgram)
        }
    }

    getObject(id: number) {
        return this.objectList[id - 1]
    }

    getListOfObjects() {
        const list = new Map<string, string[]>();
        const lineObjName = []
        const rectObjName = []
        const quadObjName = []
        for (const obj of this.objectList) {
            if (obj.objType === ObjectType.Line) {
                lineObjName.push(obj.name)
            }
            if (obj.objType === ObjectType.Rect) {
                rectObjName.push(obj.name)
            }
            if (obj.objType === ObjectType.Quad) {
                quadObjName.push(obj.name)
            }
        }
        list.set('Lines', lineObjName)
        list.set('Rect', rectObjName)
        list.set('Quad', quadObjName)
        return list
    }

    getAllObjectData() {
        const objects: ObjectData[] = []
        for (const obj of this.objectList) {
            objects.push(obj.getData())
        }
        return objects
    }

    load(objectData: ObjectData[], shader: WebGLProgram, gl: WebGL2RenderingContext) {
        for (const loadedObj of objectData) {
            const obj = new CADObject(gl.LINES, shader, gl, ObjectType.Line)
            obj.setData(loadedObj)
            this.objectList.push(obj)
        }
    }

    deselectAll() {
        for (const obj of this.objectList) {
            // obj.setSelected(false)
            obj.deselect()
        }
    }
}

export default ObjectManager