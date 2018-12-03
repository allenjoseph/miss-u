import "./styles.scss";
import { recordSelfie, startVideo } from "./camera";
import { startTime } from "./time";

document.addEventListener("DOMContentLoaded", () => {
  const $video = document.getElementById("video");
  const $time = document.getElementById("time");

  document
    .getElementById("home")
    .addEventListener(
      "click",
      event => startRecord($video, event.target),
      false
    );

  startVideo($video);
  startTime($time);
});

function startRecord($video, $button) {
  const $rec = document.getElementById("rec");
  const $gif = document.getElementById("gif");
  const $loader = document.getElementById("loader");

  const selfie$ = recordSelfie($video);

  $rec.classList.add("active");
  $button.classList.add("active");

  selfie$.on("processing", () => {
    $loader.classList.add("active");

    $gif.innerHTML = "";
    $rec.classList.remove("active");
    $button.classList.remove("active");
  });

  selfie$.on("done", data => {
    const img = new Image();
    img.className = "preview-gif";
    img.src = data;
    img.onload = () => $loader.classList.remove("active");

    $gif.appendChild(img);
  });
}
