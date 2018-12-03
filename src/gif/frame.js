import 'babel-polyfill';

export default class Frame {
    constructor(pos, image, worker) {
        this.worker = worker;
        this.data = {
            palette: null,
            position: pos,
            sampleInterval: 10,
            data: image.data,
            width: image.width,
            height: image.height
        }
    }

    async quantizate() {
        const result = await this.worker.process(this.data);
        this.data.pixels = Array.prototype.slice.call(result.pixels);
        this.data.palette = Array.prototype.slice.call(result.palette);

        // Delete original data, and free memory
        delete this.data.data;

        return this.data;
    }
}
