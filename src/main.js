import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import GUI from 'lil-gui'; 

// anim
import { AnimationMixer } from 'three';
import { AnimationClip } from 'three';
import { AnimationAction } from 'three';

// ============================== Global - variables ================================

let sceneModel = '/assets/glb/P_V3.glb';

const scene1Model = '/assets/glb/Z1.glb'
const scene2Model = '/assets/glb/Z2.glb'
const scene3Model = '/assets/glb/Z3.glb'
const scene4Model = '/assets/glb/Z4.glb'

let mixer;

// const loader = new THREE.GLTFLoader()  // This comes from GLTFLoader.js.
const loader = new GLTFLoader()  // This comes from GLTFLoader.js.
const raycaster = new THREE.Raycaster()
const tapPosition = new THREE.Vector2()
const clock = new THREE.Clock()

const model = []
const modelScale = 10
let currentIndex = 0

// ============================== Global - variables ================================

let videoSources = [
  '/assets/videos/v_1.mp4',
  '/assets/videos/v_2.mp4',
  '/assets/videos/v_3.mp4',
  '/assets/videos/v_4.mp4',
];

let videoAspectRatios = [
  1,
  1,
  1,
  1,
];

let videoName = [
  'Zone - 1',
  'Zone - 2',
  'Zone - 3',
  'Zone - 4',
];

const video = []
const videoTexture = []

// ============================== GUI - Setup ======================================

const gui = new GUI();

const videoFolder = gui.addFolder('Video Texture');
videoFolder.open();

videoSources.forEach((source, index) => {
  videoFolder.add({ play: () => switchTexture(index) }, 'play').name(videoName[index]);
});

// ================================= Video Textures ==================================

const videoTextureSetup = (source, aspect, index) => {
// Video Element and Video Texture
  video[index] = document.createElement('video');
  video[index].src = source; // path to your video file in public/assets
  video[index].loop = false;
  video[index].muted = true; // Required for autoplay in some browsers
  video[index].playsInline = true;
  video[index].crossOrigin = 'anonymous'; // Allow cross-origin access

  videoTexture[index] = new THREE.VideoTexture(video[index]);
  videoTexture[index].minFilter = THREE.LinearFilter;
  videoTexture[index].magFilter = THREE.LinearFilter;
  videoTexture[index].format = THREE.RGBFormat;
  videoTexture[index].flipY = false;
  videoTexture[index].encoding = THREE.sRGBEncoding;

  // Video Aspect Ratio
  videoTexture[index].repeat.set(1, aspect);
  videoTexture[index].offset.set(0, (1 - aspect) / 2);
}

// Create video textures for each source
for (let i=0; i < videoSources.length; i++) {
  videoTextureSetup(videoSources[i], videoAspectRatios[i], i);
}

// Video Material
const videoMaterial = new THREE.MeshBasicMaterial();

// Switch Video textures
function switchTexture(index) {
  if (videoMaterial.map) {
    videoMaterial.map.dispose()  // Dispose of the old texture
  }

  videoMaterial.map = videoTexture[index]  // Set the new texture
  videoMaterial.needsUpdate = true

  video[index].pause()
  video[index].currentTime = 0
  video[index].load()

  video[index].play()  // Play the new video

  console.log('Switched to video texture:', videoName[index])
}

switchTexture(0);

function switchModel(index) {
  model[0].visible = false
  model[1].visible = false
  model[2].visible = false
  model[3].visible = false

  model[index].visible = true
}

function switchIndex() {
  currentIndex++
  if (currentIndex > 3) currentIndex = 0
  switchTexture(currentIndex)
  switchModel(currentIndex)
  console.log(mixer[currentIndex])
  mixer[currentIndex].setTime(0)
}

// ================================= ThreeJS - Scene ================================

// Create scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.001,
  10
);

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
renderer.physicallyCorrectLights = true; // Enable physically correct lights
renderer.setClearColor(0x444444, 1); // Set background color to black

document.body.appendChild(renderer.domElement); 

// Tone mapping
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Set camera position and rotation
camera.position.x = -0.1;
camera.position.y =  0.1;
camera.position.z =  0.1;

// Set up OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation
controls.minDistance = .01; // Limit zoom
controls.maxDistance = 1; // Limit zoom
controls.enableZoom = true; // Enable zoom
controls.enablePan = true; // Enable pan
controls.enableRotate = true; // Enable rotation
controls.autoRotate = false; // Disable auto-rotation
controls.autoRotateSpeed = 2.0; // Speed of auto-rotation

// Set up lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);
const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// ================================ GLTF - Model ================================

function resolve(gltf, index) {
  // Add the loaded model to the scene
  model[index] = gltf.scene
  model[index].visible = false
  scene.add(model[index])
  console.log('Model loaded:', model[index])

  // Video Texture
  model[index].traverse((child) => {
    if (child.isMesh && child.material && (
      child.material.name === 'Video_Mat_1' ||
      child.material.name === 'Video_Mat_2' ||
      child.material.name === 'Video_Mat_3' ||
      child.material.name === 'Video_Mat_4'
    )) {
      child.material = videoMaterial
    }
  })

  // Set up the AnimationMixer and play all animations
  mixer[index] = new THREE.AnimationMixer(model[index])
  gltf.animations.forEach((clip) => {
    mixer[index].clipAction(clip).play()
    mixer[index].clipAction(clip).setLoop(THREE.LoopOnce)
    mixer[index].clipAction(clip).clampWhenFinished = true  // Clamp the animation
  })
}

loader.load(scene1Model,
  (gltf) => {
    // resolve(gltf, 0)
  })

loader.load(scene2Model,
  (gltf) => {
    // resolve(gltf, 1)
  })

loader.load(scene3Model,
  (gltf) => {
    // resolve(gltf, 2)
  })

loader.load(scene4Model,
  (gltf) => {
    // resolve(gltf, 3)
  })

// Here we add an event listener to the button.
document.getElementById('actionButton').addEventListener('click', () => {
  // switchIndex()
})

// ================================= Animation - loop ================================

function animate() {
  requestAnimationFrame(animate)
  
  if (mixer[currentIndex]) {
    const delta = clock.getDelta()
    mixer[currentIndex].update(delta)
  }

  renderer.render(scene, camera);
}
animate();

// Handle browser resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
