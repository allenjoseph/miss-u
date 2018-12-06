import './styles.scss';
import { startRecord, startVideo } from './camera';
import { startTime } from './time';

document.addEventListener('DOMContentLoaded', () => {
  const $video = document.getElementById('video');
  const $time = document.getElementById('time');

  document
    .getElementById('home')
    .addEventListener(
      'click',
      event => startRecord($video, event.target),
      false
    );

  startVideo($video);
  startTime($time);
});
