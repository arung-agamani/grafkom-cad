import CADObject from './CADObject'

class ObjectManager {
    public objectList: CADObject[];
    public lineCount = 0;
    public rectCount = 0;
    public quadCount = 0

    constructor() {
        this.objectList = new Array<CADObject>()
    }

    addObject(obj: CADObject) {
        switch (obj.type) {
            case WebGL2RenderingContext.LINES:
                this.lineCount++
                break
        }
        this.objectList.push(obj)
    }
    
    render() {
        for (const obj of this.objectList) {
            obj.draw()
        }
    }
}

export default ObjectManager