import * as THREE from "three";
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
import { LineMaterial } from 'jsm/lines/LineMaterial.js';
import { Wireframe } from 'jsm/lines/Wireframe.js';
import { WireframeGeometry2 } from 'jsm/lines/WireframeGeometry2.js';

const sceneMiddle = new THREE.Vector3(2, 0, 0);
const gltfLoader = new GLTFLoader();
const tetra = gltfLoader.loadAsync('./glb/tetra-wire.glb');
let tGeo;
tetra.then((g) => {
  tGeo = g.scene.children[0].geometry;
  tGeo.scale(0.65, 0.65, 0.65);
});

function getBody(RAPIER, world) {
  const size = 1;
  const range = 6;
  const density = size * 0.5;
  const geometry = tGeo;

  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5;
  let z = Math.random() * range - range * 0.5;
  // physics
  let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(x, y, z);
  let rigid = world.createRigidBody(rigidBodyDesc);
  let points = geometry.attributes.position.array;
  let colliderDesc = RAPIER.ColliderDesc.convexHull(points).setDensity(density);
  world.createCollider(colliderDesc, rigid);

  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.85, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(size);

  const wireMat = new LineMaterial({
    color: 0x000000,
    linewidth: 7, // in pixels
  });

  const wireGeo = new WireframeGeometry2(geometry);
  const wireframe = new Wireframe(wireGeo, wireMat);
  wireframe.computeLineDistances();
  wireframe.scale.set(1, 1, 1);
  mesh.add(wireframe);

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

function getCollider(RAPIER, world) {
  const mouseSize = 0.075;
  const geometry = new THREE.IcosahedronGeometry(mouseSize, 4);
  const material = new THREE.MeshBasicMaterial({});
  const mouseMesh = new THREE.Mesh(geometry, material);
  // RIGID BODY
  let bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0, 0)
  let mouseRigid = world.createRigidBody(bodyDesc);
  let dynamicCollider = RAPIER.ColliderDesc.ball(mouseSize * 10.0);
  world.createCollider(dynamicCollider, mouseRigid);
  function update(pos) {
    mouseRigid.setTranslation({ x: pos.x, y: pos.y, z: 0.2 });
    let { x, y, z } = mouseRigid.translation();
    mouseMesh.position.set(x, y, z);
  }
  mouseMesh.userData.update = update;
  return mouseMesh;
}

export { getBody, getCollider };