import Record from '../record/record';
import 'webrtc-adapter';

function getVideoStream() {
  const hdConstraints = {
    width: { exact: 1280 },
    height: { exact: 720 }
  };
  return navigator.mediaDevices.getUserMedia({
    video: hdConstraints,
    audio: false
  });
}

export async function startVideo($video) {
  if (Record.isMobile()) {
    const $device = document.getElementById('device');
    $device.style.width = document.documentElement.clientWidth + 'px';
    $device.style.height = document.documentElement.clientHeight + 'px';
  }
  // eslint-disable-next-line no-param-reassign
  $video.srcObject = await getVideoStream();
}

export function startRecord($video, $button) {
  const $rec = document.getElementById('rec');
  const $gif = document.getElementById('gif');
  const $loader = document.getElementById('loader');

  const record$ = new Record($video);
  record$.start();

  $rec.classList.add('active');
  $button.classList.add('active');

  record$.on('processing', () => {
    $loader.classList.add('active');

    $gif.innerHTML = '';
    $gif.href = '#';
    $rec.classList.remove('active');
    $button.classList.remove('active');
  });

  record$.on('done', data => {
    const img = new Image();
    img.className = 'preview-img';
    img.src = data;
    img.onload = () => $loader.classList.remove('active');

    $gif.href = data;
    $gif.appendChild(img);
  });
}
