import NeuQuant from '../dependencies/NeuQuant';
import 'babel-polyfill';

export default class QuantizeWorker {
    constructor() {
        this.idle = [];
        this.idle.push(this.getWorker())
    }

    async process(data) {
        const worker = this.getWorker();
        worker.postMessage(data);

        return new Promise(resolve => {
            worker.onmessage = e => {
                this.idle.push(worker);
                resolve(e.data);
            };
        });
    }

    getWorker() {
        if (this.idle.length) {
            return this.idle.pop();
        }

        const content = NeuQuant.toString() + '(' + workerCode.toString() + '());';
        const blob = new Blob([content], { type: 'text/javascript' });
        const objectURL = URL.createObjectURL(blob);

        return new Worker(objectURL);
    }

    termiateWorkers() {
        console.info(`Used ${this.idle.length} workers to complete process.`);
        this.idle.splice(0).forEach(worker => worker.terminate());
    }
}

function workerCode() {
    var self = this;
    var workerMethods = {
        dataToRGB: function dataToRGB(data, width, height) {
            var length = width * height * 4;
            var i = 0;
            var rgb = [];
            while (i < length) {
                rgb.push(data[i++]);
                rgb.push(data[i++]);
                rgb.push(data[i++]);
                i++; // for the alpha channel which we don't care about
            }
            return rgb;
        },
        componentizedPaletteToArray: function componentizedPaletteToArray(paletteRGB) {
            paletteRGB = paletteRGB || [];
            var paletteArray = [];
            for (var i = 0; i < paletteRGB.length; i += 3) {
                var r = paletteRGB[i];
                var g = paletteRGB[i + 1];
                var b = paletteRGB[i + 2];
                paletteArray.push(r << 16 | g << 8 | b);
            }
            return paletteArray;
        },
        processFrameWithQuantizer: function processFrameWithQuantizer(imageData, width, height, sampleInterval) {
            var rgbComponents = this.dataToRGB(imageData, width, height);
            var newquant = eval('NeuQuant');
            var nq = new newquant(rgbComponents, rgbComponents.length, sampleInterval);
            var paletteRGB = nq.process();
            var paletteArray = new Uint32Array(this.componentizedPaletteToArray(paletteRGB));
            var numberPixels = width * height;
            var indexedPixels = new Uint8Array(numberPixels);
            var k = 0;
            for (var i = 0; i < numberPixels; i++) {
                var r = rgbComponents[k++];
                var g = rgbComponents[k++];
                var b = rgbComponents[k++];
                indexedPixels[i] = nq.map(r, g, b);
            }
            return {
                pixels: indexedPixels,
                palette: paletteArray
            };
        },
        run: function run(frame) {
            frame = frame || {};
            var _frame = frame,
                height = _frame.height,
                sampleInterval = _frame.sampleInterval,
                width = _frame.width;
            var imageData = frame.data;
            return this.processFrameWithQuantizer(imageData, width, height, sampleInterval);
        }
    };
    try {
        self.onmessage = function (ev) {
            var data = ev.data || {};
            var response = workerMethods.run(data);
            postMessage(response);
        };
    } catch (e) {}
    return workerMethods;
}