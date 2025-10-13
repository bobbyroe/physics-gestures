import * as THREE from "three";
import { getBody, getCollider } from "./getBodies.js";
import RAPIER from 'rapier';
import vision from "mediapipe";
const { HandLandmarker, FilesetResolver } = vision;

// init three.js scene
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
});
const videomesh = new THREE.Mesh(geometry, material);
videomesh.rotation.y = Math.PI;
scene.add(videomesh);

// init MediaPipe
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

// physics
await RAPIER.init();
const gravity = { x: 0.0, y: 0, z: 0.0 };
const world = new RAPIER.World(gravity);

const numBodies = 20;
const bodies = [];
for (let i = 0; i < numBodies; i++) {
  const body = getBody(RAPIER, world);
  bodies.push(body);
  scene.add(body.mesh);
}

// hand-tracking colliders
const stuffGroup = new THREE.Group();
scene.add(stuffGroup);
const numBalls = 21;
for (let i = 0; i < numBalls; i++) {
  const mesh = getCollider(RAPIER, world);
  stuffGroup.add(mesh);
}

// Rapier debug view
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

  // computer vision / hand-tracking stuff
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    const handResults = handLandmarker.detectForVideo(video, Date.now());

    if (handResults.landmarks.length > 0) {
      handResults.landmarks.forEach((landmarks) => {
        landmarks.forEach((landmark, j) => {
          const pos = {
            x: (landmark.x * videomesh.scale.x - videomesh.scale.x * 0.5) * -1,
            y: -landmark.y * videomesh.scale.y + videomesh.scale.y * 0.5,
            z: landmark.z,
          };
          const mesh = stuffGroup.children[j];
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