import QuantizeWorker from "../gif/quantize-worker";
import generateGif from "../gif/gif-generator";
import Frame from "../gif/frame";
import EventEmitter from "events";

export async function startVideo($video) {
  $video.srcObject = await getVideoStream();
  $video.play();
}

function getVideoStream() {
  return navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false
  });
}

export function recordSelfie($video) {
  const selfie$ = new EventEmitter();
  const coords = getSourceCoords($video);
  const context = getCanvasContext(coords);

  const quantizeWorker = new QuantizeWorker();
  const asyncFrames = [];
  const numFrames = 10;

  let counter = 0;
  const interval = setInterval(async () => {
    counter++;

    if (counter === 1) {
      selfie$.emit("start");
    }

    context.drawImage(
      $video,
      coords.sx,
      coords.sy,
      coords.sw,
      coords.sh,
      0,
      0,
      coords.sw,
      coords.sh
    );
    const imageData = context.getImageData(0, 0, coords.sw, coords.sh);
    const frame = new Frame(counter, imageData, quantizeWorker);

    asyncFrames.push(frame.quantizate());

    if (counter === numFrames) {
      clearInterval(interval);
      selfie$.emit("processing");
      const frames = await Promise.all(asyncFrames);
      const gif = generateGif(frames);
      selfie$.emit("done", gif);

      quantizeWorker.termiateWorkers();
    }
  }, 100);

  return selfie$;
}

function getSourceCoords($video) {
  const videoWidth = $video.videoWidth;
  const videoHeight = $video.videoHeight;

  const videoContainer = document.querySelector(".device .item.camera");
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
  };
}

function getCanvasContext(coords) {
  const canvas = document.getElementById("canvas");
  canvas.width = coords.sw;
  canvas.height = coords.sh;

  const context = canvas.getContext("2d");
  context.translate(coords.sw, 0); // move the canvas over to compensate for the flip
  context.scale(-1, 1); // flip horizontal

  return context;
}
