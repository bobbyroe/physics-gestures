import { HandLandmarker, FilesetResolver } from "mediapipe";

const video = document.createElement("video");

async function getVisionStuff() {
  const wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm";
  const filesetResolver = await FilesetResolver.forVisionTasks(wasmPath);
  const modelAssetPath = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
  const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then(function (stream) {
        video.srcObject = stream;
        video.play();
      })
      .catch(function (error) {
        console.error("🛑 Unable to access the camera/webcam.", error);
      });
  }
  return { video, handLandmarker };
}
export default getVisionStuff;