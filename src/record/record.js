import { EventEmitter } from 'events';
import Frame from './frame';
import generateGif from '../gif/gif-generator';
import QuantizeWorker from '../gif/quantize-worker';

export default class Record extends EventEmitter {
  constructor($video) {
    super();
    this.$el = $video;
    this.frames = [];
    this.coords = this.getSourceCoords();
    this.canvas = this.getCanvas();
    this.worker = new QuantizeWorker();
    this.numFrames = 10;
  }

  start() {
    this.emit('start');
    let counter = 0;
    const interval = setInterval(() => {
      counter += 1;
      this.addFrame(counter);

      if (counter === this.numFrames) {
        clearInterval(interval);
        this.concatFrames();
      }
    }, 100);
  }

  addFrame(index) {
    this.drawImage();
    const frame = new Frame(index, this.getImage(), this.worker);
    this.frames.push(frame.quantizate());
  }

  async concatFrames() {
    this.emit('processing');

    const frames = await Promise.all(this.frames);
    const gif = generateGif(frames);
    this.worker.termiateWorkers();

    this.emit('done', gif);
  }

  drawImage() {
    this.canvas.context.drawImage(
      this.$el,
      this.coords.sx,
      this.coords.sy,
      this.coords.sw,
      this.coords.sh,
      0,
      0,
      this.coords.sw,
      this.coords.sh
    );
  }

  getImage() {
    return this.canvas.context.getImageData(
      0,
      0,
      this.coords.sw,
      this.coords.sh
    );
  }

  getSourceCoords() {
    const videoWidth = this.$el.videoWidth;
    const videoHeight = this.$el.videoHeight;
    let width = 360;
    let height = 568;

    if (Record.isMobile()) {
      width = document.documentElement.clientWidth;
      height = document.documentElement.clientHeight;
    }

    return {
      sx: videoWidth > width ? (videoWidth - width) / 2 : 0,
      sy: videoHeight > height ? (videoHeight - height) / 2 : 0,
      sw: videoWidth > width ? width : videoWidth,
      sh: videoHeight > height ? height : videoHeight
    };
  }

  getCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.coords.sw;
    canvas.height = this.coords.sh;

    const context = canvas.getContext('2d');
    context.translate(this.coords.sw, 0); // move the canvas over to compensate for the flip
    context.scale(-1, 1); // flip horizontal
    return { context };
  }

  static isMobile() {
    const devices = /(iPhone|iPod|Android|BlackBerry)/;
    return devices.test(navigator.userAgent);
  }
}
