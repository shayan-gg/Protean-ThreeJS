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
let mixer;

let videoSources = [
  '/assets/videos/v_0.mp4',
  '/assets/videos/v_1.mp4',
  '/assets/videos/v_2.mp4',
  '/assets/videos/v_3.mp4',
  '/assets/videos/v_4.mp4',
];

let videoAspectRatios = [
  2,
  1,
  1,
  1,
  1,
];

let videoName = [
  'Idle Video',
  'Zone - 1',
  'Zone - 2',
  'Zone - 3',
  'Zone - 4',
];

// ============================== GUI - Setup ======================================

const gui = new GUI();

const videoFolder = gui.addFolder('Video Texture');
videoFolder.open();

videoSources.forEach((source, index) => {
  videoFolder.add({ play: () => switchTexture(index) }, 'play').name(videoName[index]);
});

// ================================= Video Textures ==================================

const video = [];
const videoTexture = [];

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
    videoMaterial.map.dispose(); // Dispose of the old texture
  }

  videoMaterial.map = videoTexture[index]; // Set the new texture
  videoMaterial.needsUpdate = true;
  video[index].play(); // Play the new video

  console.log('Switched to video texture:', videoName[index]);
}

switchTexture(0); // Start with the first video texture

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

const loader = new GLTFLoader();
loader.load(sceneModel,
  (gltf) => {
    resolve(gltf);
  },
  undefined,

  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },

  (error) => {
    console.error('An error occurred while loading the model:', error);
  }
);

function resolve(gltf) {
  // Add the loaded model to the scene
  const model = gltf.scene;
  scene.add(model);
  console.log('Model loaded:', model);

  // Video Texture
  model.traverse((child) => {
    if (child.isMesh && child.material && child.material.name === 'Display') {
      // child.material = new THREE.MeshBasicMaterial({
      //   map: videoTexture1,
      // });
      // video1.play();
      // console.log('Video texture applied to:', child);

      child.material = videoMaterial
    }
  });

  // Set up the AnimationMixer and play all animations
  mixer = new THREE.AnimationMixer(model);
  gltf.animations.forEach((clip) => {
    mixer.clipAction(clip).play();
    mixer.clipAction(clip).setLoop(THREE.LoopOnce);
    mixer.clipAction(clip).clampWhenFinished = true; // Clamp the animation
  });
}

// ================================= Animation - loop ================================

function animate() {
  requestAnimationFrame(animate);
  controls.update(); // Update controls
  if (mixer) {
    mixer.update(0.01); // Update the animation mixer
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
