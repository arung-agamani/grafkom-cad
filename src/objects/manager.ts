import CADObject from './CADObject'
import { ObjectType } from '../interfaces'

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
    
    render() {
        for (const obj of this.objectList) {
            obj.draw()
        }
    }

    renderTex() {
        for (const obj of this.objectList) {
            obj.drawSelect(this.selectProgram)
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

    deselectAll() {
        for (const obj of this.objectList) {
            obj.setSelected(false)
        }
    }
}

export default ObjectManager