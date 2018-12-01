import './styles.scss';
import 'babel-polyfill';
import NeuQuant from './dependencies/NeuQuant';
import gifWriter from './dependencies/gifWriter';

const allFrames = [];

document.addEventListener('DOMContentLoaded', () => {

    document
        .getElementById('home')
        .addEventListener('click', startCapture, false);

    startVideo();
});

function getVideoStream() {
    return navigator.mediaDevices.getUserMedia({
        video: true, audio: false
    });
}

async function startVideo() {
    const videoElement = document.getElementById('video');
    videoElement.srcObject = await getVideoStream();
    videoElement.play();
}

function startCapture() {
    const videoElement = document.getElementById('video');
    const coords = getSourceCoords(videoElement);
    const context = getCanvasContext(coords);

    let counter = 0;
    const interval = setInterval(() => {
        counter++;

        context.drawImage(videoElement, coords.sx, coords.sy, coords.sw, coords.sh, 0, 0, coords.sw, coords.sh);
        const imageData = context.getImageData(0, 0, coords.sw, coords.sh);

        const frame = {
            data: imageData.data,
            width: imageData.width,
            height: imageData.height,
            palette: null,
            done: false,
            sampleInterval: 10,
            gifshot: true
        }

        processFrame(frame);

        if (counter === 10) { clearInterval(interval); }
    }, 100);
}

function getCanvasContext(coords) {
    const canvas = document.getElementById('canvas');
    canvas.width = coords.sw;
    canvas.height = coords.sh;

    const context = canvas.getContext('2d');
    context.translate(coords.sw, 0); // move the canvas over to compensate for the flip
    context.scale(-1, 1); // flip horizontal

    return context;
}

function getSourceCoords(videoElement) {
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;

    const videoContainer = document.querySelector('.device .item.camera');
    const width = videoContainer.offsetWidth; // 320
    const height = videoContainer.offsetHeight; // 568

    const sourceX = videoWidth > width ? (videoWidth - width) / 2 : 0;
    const sourceY = videoHeight > height ? (videoHeight - height) / 2 : 0;
    const sourceWidth = videoWidth > width ? width : videoWidth;
    const sourceHeight = videoHeight > height ? height : videoHeight;

    return {
        sx: sourceX,
        sy: sourceY,
        sw: sourceWidth,
        sh: sourceHeight
    }
}

function processFrame(frame) {
    const worker = getWorker();
    worker.onmessage = e => {
        processFrameCompleted(e.data, frame);
        worker.terminate();
    };
    worker.postMessage(frame);
}

function processFrameCompleted(data, frame) {
    frame.pixels = Array.prototype.slice.call(data.pixels);
    frame.palette = Array.prototype.slice.call(data.palette);
    frame.done = true;

    // Delete original data, and free memory
    delete frame.data;

    pushProcessedFrame(frame);
}

function pushProcessedFrame(frame) {
    allFrames.push(frame);
    if (allFrames.length < 10) {
        return;
    }
    generateGif();
}

function generateGif() {
    const buffer = [];
    const width = allFrames[0].width;
    const height = allFrames[0].height;
    const gifOptions = {
        loop: 0
    };

    const gw = new gifWriter(buffer, width, height, gifOptions);

    allFrames.forEach(frame => {
        gw.addFrame(0, 0, width, height, frame.pixels, {
            palette: frame.palette,
            delay: 10
        });
    });

    gw.end();

    const gift = 'data:image/gif;base64,' + btoa(bufferToString(buffer));
    console.log(gift);
}

function bufferToString(buffer) {
    const numberValues = buffer.length;
    let str = '';
    let x = -1;
    const byteMap = function () {
        const byteMap = [];
        for (let i = 0; i < 256; i++) {
            byteMap[i] = String.fromCharCode(i);
        }
        return byteMap;
    }();
    while (++x < numberValues) {
        str += byteMap[buffer[x]];
    }
    return str;
}

function getWorker() {
    var content = NeuQuant.toString() + '(' + workerCode.toString() + '());';
    const blob = new Blob([content], { type: 'text/javascript' });
    const objectURL = URL.createObjectURL(blob);
    return new Worker(objectURL);
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
            var response;
            if (data.gifshot) {
                response = workerMethods.run(data);
                postMessage(response);
            }
        };
    } catch (e) {}
    return workerMethods;
}