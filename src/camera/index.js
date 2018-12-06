import Record from '../record/record';

function getVideoStream() {
  return navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false
  });
}

export async function startVideo($video) {
  // eslint-disable-next-line no-param-reassign
  $video.srcObject = await getVideoStream();
  $video.play();
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
    $rec.classList.remove('active');
    $button.classList.remove('active');
  });

  record$.on('done', data => {
    const img = new Image();
    img.className = 'preview-gif';
    img.src = data;
    img.onload = () => $loader.classList.remove('active');

    $gif.appendChild(img);
  });
}
