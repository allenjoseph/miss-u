/* eslint-disable vars-on-top */
/* eslint-disable no-plusplus */
import NeuQuant from '../dependencies/NeuQuant';

function workerCode(NewQ) {
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
    componentizedPaletteToArray: function componentizedPaletteToArray(
      paletteRGB
    ) {
      // eslint-disable-next-line no-param-reassign
      paletteRGB = paletteRGB || [];
      var paletteArray = [];
      for (var i = 0; i < paletteRGB.length; i += 3) {
        var r = paletteRGB[i];
        var g = paletteRGB[i + 1];
        var b = paletteRGB[i + 2];
        // eslint-disable-next-line no-bitwise
        paletteArray.push((r << 16) | (g << 8) | b);
      }
      return paletteArray;
    },
    processFrameWithQuantizer: function processFrameWithQuantizer(
      imageData,
      width,
      height,
      sampleInterval
    ) {
      var rgbComponents = this.dataToRGB(imageData, width, height);
      var nq = new NewQ(rgbComponents, rgbComponents.length, sampleInterval);
      var paletteRGB = nq.process();
      var paletteArray = new Uint32Array(
        this.componentizedPaletteToArray(paletteRGB)
      );
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
      // eslint-disable-next-line no-param-reassign
      frame = frame || {};
      var height = frame.height;
      var sampleInterval = frame.sampleInterval;
      var width = frame.width;
      var imageData = frame.data;
      return this.processFrameWithQuantizer(
        imageData,
        width,
        height,
        sampleInterval
      );
    }
  };
  try {
    self.onmessage = function run(ev) {
      var data = ev.data || {};
      var response = workerMethods.run(data);
      postMessage(response);
    };
  } catch (e) {
    /** */
  }
  return workerMethods;
}

export default class QuantizeWorker {
  constructor() {
    this.idle = [];
    this.idle.push(this.getWorker());
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

    const content = `${NeuQuant.toString()}(${workerCode.toString()}(${NeuQuant.toString()}));`;
    const blob = new Blob([content], { type: 'text/javascript' });
    const objectURL = URL.createObjectURL(blob);

    return new Worker(objectURL);
  }

  termiateWorkers() {
    // eslint-disable-next-line no-console
    console.info(`Used ${this.idle.length} workers to complete process.`);
    this.idle.splice(0).forEach(worker => worker.terminate());
  }
}
