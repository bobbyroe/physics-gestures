import * as THREE from "three";
import { getBody, getMouseBall } from "./getBodies.js";
import RAPIER from 'rapier';
// Mediapipe
import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
const { HandLandmarker, FilesetResolver } = vision;

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(75, w / h, 1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Video Texture
const video = document.createElement("video");
const texture = new THREE.VideoTexture(video);
texture.colorSpace = THREE.SRGBColorSpace;
const geometry = new THREE.PlaneGeometry(1, 1);
const material = new THREE.MeshBasicMaterial({
  map: texture,
  depthWrite: false,
  side: THREE.DoubleSide,
  // wireframe: true,
});
const videomesh = new THREE.Mesh(geometry, material);
videomesh.rotation.y = Math.PI;
scene.add(videomesh);

// MediaPipe
const filesetResolver = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
);
const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
  baseOptions: {
    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
    delegate: "GPU",
  },
  runningMode: "VIDEO",
  numHands: 2,
});
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "user" } })
    .then(function (stream) {
      video.srcObject = stream;
      video.play();
    })
    .catch(function (error) {
      console.error("Unable to access the camera/webcam.", error);
    });
}

let mousePos = new THREE.Vector3();

await RAPIER.init();
const gravity = { x: 0.0, y: 0, z: 0.0 };
const world = new RAPIER.World(gravity);

const numBodies = 40;
const bodies = [];
for (let i = 0; i < numBodies; i++) {
  const body = getBody(RAPIER, world);
  bodies.push(body);
  scene.add(body.mesh);
}

const stuffGroup = new THREE.Group();
scene.add(stuffGroup);
const numBalls = 21;
for (let i = 0; i < numBalls; i++) {
  const mesh = getMouseBall(RAPIER, world);
  stuffGroup.add(mesh);
}

const hemiLight = new THREE.HemisphereLight(0x00bbff, 0xaa00ff);
hemiLight.intensity = 0.2;
scene.add(hemiLight);

const pointsGeo = new THREE.BufferGeometry();
const pointsMat = new THREE.PointsMaterial({
  size: 0.05,
  vertexColors: true
});
const points = new THREE.Points(pointsGeo, pointsMat);
scene.add(points);

function renderDebugView() {
  const { vertices, colors } = world.debugRender();
  pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function animate() {

  bodies.forEach(b => b.update());
  world.step();
  renderer.render(scene, camera);
  // renderDebugView();
  //
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    const handResults = handLandmarker.detectForVideo(video, Date.now());

    if (handResults.landmarks.length > 0) {
      let index = 0;
      handResults.landmarks.forEach((landmarks, i) => {
        landmarks.forEach((landmark, j) => {
          const pos = {
            x: (landmark.x * videomesh.scale.x - videomesh.scale.x * 0.5) * -1,
            y: -landmark.y * videomesh.scale.y + videomesh.scale.y * 0.5,
            z: landmark.z,
          };
          const mesh = stuffGroup.children[j];
          index += 1;
          mesh.userData.update(pos);
        });
      });
    } else {
      for (let i = 0; i < numBalls; i++) {
        const mesh = stuffGroup.children[i];
        mesh.position.set(0, 0, 10);
      }
    }
  }

  videomesh.scale.x = video.videoWidth * 0.01;
  videomesh.scale.y = video.videoHeight * 0.01;
}
renderer.setAnimationLoop(animate);

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);

// mouse move handler
function handleMouseMove(evt) {
  mousePos.x = (evt.clientX / window.innerWidth) * 2 - 1;
  mousePos.y = -(evt.clientY / window.innerHeight) * 2 + 1;
}
window.addEventListener('mousemove', handleMouseMove, false);

