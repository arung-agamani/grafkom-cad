class Point {
    public x: number;
    public y: number;
    public color: Array<number>;

    constructor(posX: number, posY: number, color: Array<number>) {
        this.x = posX;
        this.y = posY;
        if (color.length < 4) {
            throw new Error('color array must be array of 4 numbers')
        }
        this.color = color.slice(0, 4);
    }
}

export default Point