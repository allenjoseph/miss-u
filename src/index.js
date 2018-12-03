import './styles.scss';
import 'babel-polyfill';
import QuantizeWorker from './gif/quantize-worker';
import generateGif from './gif/gif-generator';
import Frame from './gif/frame';

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
    const quantizeWorker = new QuantizeWorker();
    const asyncFrames = [];
    const numFrames = 10;
    let counter = 0;

    const interval = setInterval(async() => {
        counter++;

        context.drawImage(videoElement, coords.sx, coords.sy, coords.sw, coords.sh, 0, 0, coords.sw, coords.sh);
        const imageData = context.getImageData(0, 0, coords.sw, coords.sh);
        const frame = new Frame(counter, imageData, quantizeWorker);

        asyncFrames.push(frame.quantizate());

        if (counter === numFrames) {
            clearInterval(interval);
            const frames = await Promise.all(asyncFrames);
            console.log(generateGif(frames));
            quantizeWorker.termiateWorkers();
        }
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