import * as THREE from "three";
import { getBody, getCollider } from "./getBodies.js";
import RAPIER from 'rapier';
import getVisionStuff from "./getVisionStuff.js";

// init three.js scene
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(75, w / h, 1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

// init video and MediaPipe
const { video, handLandmarker } = await getVisionStuff();

// Video Mesh
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
const colliderGroup = new THREE.Group();
scene.add(colliderGroup);
const numBalls = 21;
for (let i = 0; i < numBalls; i++) {
  const mesh = getCollider(RAPIER, world);
  colliderGroup.add(mesh);
}

// Rapier debug view
const pointsGeo = new THREE.BufferGeometry();
const pointsMat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true });
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
          const mesh = colliderGroup.children[j];
          mesh.userData.update(pos);
        });
      });
    } else {
      for (let i = 0; i < numBalls; i++) {
        const mesh = colliderGroup.children[i];
        mesh.position.set(0, 0, 10);
      }
    }
  }
  videomesh.scale.x = video.videoWidth * 0.016;
  videomesh.scale.y = video.videoHeight * 0.016;
}
renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});