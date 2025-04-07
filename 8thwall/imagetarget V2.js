const imageTargetPipelineModule = () => {
  const loader = new THREE.GLTFLoader()  // This comes from GLTFLoader.js.
  const raycaster = new THREE.Raycaster()
  const tapPosition = new THREE.Vector2()
  const clock = new THREE.Clock()

  const model = []
  let videoObj
  const modelScale = 10
  let currentIndex = 0

  // ============================== Global - variables ================================

  const sceneModel = require('./assets/P_V3.glb')

  const scene1Model = require('./assets/Z1.glb')
  const scene2Model = require('./assets/Z2.glb')
  const scene3Model = require('./assets/Z3.glb')
  const scene4Model = require('./assets/Z4.glb')

  const mixer = []

  const videoSources = [
    require('./assets/v_1.mp4'),
    require('./assets/v_2.mp4'),
    require('./assets/v_3.mp4'),
    require('./assets/v_4.mp4'),
  ]

  const videoAspectRatios = [
    1,
    1,
    1,
    1,
  ]

  const videoName = [
    'Zone - 1',
    'Zone - 2',
    'Zone - 3',
    'Zone - 4',
  ]

  const video = []
  const videoTexture = []

  // Populates some object into an XR scene and sets the initial camera position. The scene and
  // camera come from xr3js, and are only available in the camera loop lifecycle onStart() or later.
  const initXrScene = ({scene, camera, renderer}) => {
    // ================================= Video Textures ==================================

    const videoTextureSetup = (source, aspect, index) => {
    // Video Element and Video Texture
      video[index] = document.createElement('video')
      video[index].src = source  // path to your video file in public/assets
      video[index].loop = false
      video[index].muted = true  // Required for autoplay in some browsers
      video[index].playsInline = true
      video[index].crossOrigin = 'anonymous'  // Allow cross-origin access

      videoTexture[index] = new THREE.VideoTexture(video[index])
      videoTexture[index].minFilter = THREE.LinearFilter
      videoTexture[index].magFilter = THREE.LinearFilter
      videoTexture[index].format = THREE.RGBFormat
      videoTexture[index].flipY = false
      // videoTexture[index].encoding = THREE.sRGBEncoding

      // Video Aspect Ratio
      videoTexture[index].repeat.set(1, aspect)
      videoTexture[index].offset.set(0, (1 - aspect) / 2)
    }

    // Create video textures for each source
    for (let i = 0; i < videoSources.length; i++) {
      videoTextureSetup(videoSources[i], videoAspectRatios[i], i)
    }

    // Video Material
    const videoMaterial = new THREE.MeshBasicMaterial()

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

    switchTexture(2)  // Start with the first video texture

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

    // renderer
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    // Set camera position and rotation
    camera.position.x = -0.1
    camera.position.y = 0.1
    camera.position.z = 0.1

    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)
    const pointLight = new THREE.PointLight(0xffffff, 1, 100)
    pointLight.position.set(10, 10, 10)
    scene.add(pointLight)

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
        resolve(gltf, 0)
      })

    loader.load(scene2Model,
      (gltf) => {
        resolve(gltf, 1)
      })

    loader.load(scene3Model,
      (gltf) => {
        resolve(gltf, 2)
      })

    loader.load(scene4Model,
      (gltf) => {
        resolve(gltf, 3)
      })

    // Here we add an event listener to the button.
    document.getElementById('actionButton').addEventListener('click', () => {
      switchIndex()
    })

    // ================================= Animation - loop ================================

    function animate() {
      requestAnimationFrame(animate)
      if (mixer[currentIndex]) {
        const delta = clock.getDelta()
        mixer[currentIndex].update(delta)
      }

      renderer.render(scene, camera)
    }
    animate()

    // Handle browser resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  // ==================================================================================

  // Places content over image target
  const showTarget = ({detail}) => {
    // When the image target named 'model-target' is detected, show 3D model.
    // This string must match the name of the image target uploaded to 8th Wall.
    if (detail.name === 'protean-target-test') {
      model[currentIndex].position.copy(detail.position)
      model[currentIndex].quaternion.copy(detail.rotation)
      model[currentIndex].rotateX(1.5707963268)
      model[currentIndex].scale.set(
        detail.scale * modelScale, detail.scale * modelScale, detail.scale * modelScale
      )
      model[currentIndex].visible = true
    }
    // When the image target named 'video-target' is detected, play video.
    // This string must match the name of the image target uploaded to 8th Wall.
  }

  // Hides the image frame when the target is no longer detected.
  const hideTarget = ({detail}) => {
    if (detail.name === 'protean-target-test') {
      model[currentIndex].visible = false
    }
  }

  // Grab a handle to the threejs scene and set the camera position on pipeline startup.
  const onStart = ({canvas}) => {
    const {scene, camera, renderer} = XR8.Threejs.xrScene()  // Get the 3js scene from XR

    // Add content to the scene and set starting camera position.
    initXrScene({scene, camera, renderer})

    // prevent scroll/pinch gestures on canvas
    canvas.addEventListener('touchmove', (event) => {
      event.preventDefault()
    })

    // Sync the xr controller's 6DoF position and camera paremeters with our scene.
    XR8.XrController.updateCameraProjectionMatrix({
      origin: camera.position,
      facing: camera.quaternion,
    })
  }

  const onUpdate = () => {
  }

  return {
    // Camera pipeline modules need a name. It can be whatever you want but must be
    // unique within your app.
    name: 'threejs-flyer',

    // onStart is called once when the camera feed begins. In this case, we need to wait for the
    // XR8.Threejs scene to be ready before we can access it to add content. It was created in
    // XR8.Threejs.pipelineModule()'s onStart method.
    onStart,
    onUpdate,

    // Listeners are called right after the processing stage that fired them. This guarantees that
    // updates can be applied at an appropriate synchronized point in the rendering cycle.
    listeners: [
      {event: 'reality.imagefound', process: showTarget},
      {event: 'reality.imageupdated', process: showTarget},
      {event: 'reality.imagelost', process: hideTarget},
    ],
  }
}

export {imageTargetPipelineModule}
