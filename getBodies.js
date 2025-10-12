import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const sceneMiddle = new THREE.Vector3(0, 0, 0);
const gltfLoader = new GLTFLoader();
const tetra = gltfLoader.loadAsync('./glb/tetra-wire.glb');
let tGeo;
tetra.then((g) => {
  tGeo = g.scene.children[0].geometry;
});
function getBody(RAPIER, world) {
  const size = 0.4; // 0.1 + Math.random() * 0.25;
  const range = 6;
  const density = size * 0.5;
  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5 + 3;
  let z = Math.random() * range - range * 0.5;
  // physics
  let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(x, y, z);
  let rigid = world.createRigidBody(rigidBodyDesc);
  let colliderDesc = RAPIER.ColliderDesc.ball(size).setDensity(density);
  world.createCollider(colliderDesc, rigid);

  const geometry = tGeo;
  const material = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.8, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(size);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true
  });
  const wireMesh = new THREE.Mesh(geometry, wireMat);
  wireMesh.scale.setScalar(1.001);
  mesh.add(wireMesh);

  function update() {
    rigid.resetForces(true);
    let { x, y, z } = rigid.translation();
    let pos = new THREE.Vector3(x, y, z);
    let dir = pos.clone().sub(sceneMiddle).normalize();
    let q = rigid.rotation();
    let rote = new THREE.Quaternion(q.x, q.y, q.z, q.w);
    mesh.rotation.setFromQuaternion(rote);
    rigid.addForce(dir.multiplyScalar(-0.5), true);
    mesh.position.set(x, y, z);
  }
  return { mesh, rigid, update };
}

function getMouseBall(RAPIER, world) {
  const mouseSize = 0.075;
  const geometry = new THREE.IcosahedronGeometry(mouseSize, 4);
  const material = new THREE.MeshBasicMaterial({});
  // const mouseLight = new THREE.PointLight(0xffffff, 1);
  const mouseMesh = new THREE.Mesh(geometry, material);
  // mouseMesh.add(mouseLight);
  // RIGID BODY
  let bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0, 0)
  let mouseRigid = world.createRigidBody(bodyDesc);
  let dynamicCollider = RAPIER.ColliderDesc.ball(mouseSize * 10.0);
  world.createCollider(dynamicCollider, mouseRigid);
  function update(pos) {
    mouseRigid.setTranslation({ x: pos.x, y: pos.y, z: 0.2});
    let { x, y, z } = mouseRigid.translation();
    mouseMesh.position.set(x, y, z);
  }
  mouseMesh.userData.update = update;
  return mouseMesh;
}

export { getBody, getMouseBall };