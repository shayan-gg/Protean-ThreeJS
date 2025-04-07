const imageTargetPipelineModule = () => {
  const loader = new THREE.GLTFLoader()  // This comes from GLTFLoader.js.
  const raycaster = new THREE.Raycaster()
  const tapPosition = new THREE.Vector2()
  const clock = new THREE.Clock()

  let model
  let videoObj
  const modelScale = 10

  // ============================== Global - variables ================================

  const sceneModel = require('./assets/P_V3.glb')
  let mixer

  const videoSources = [
    require('./assets/v_0.mp4'),
    require('./assets/v_1.mp4'),
    require('./assets/v_2.mp4'),
    require('./assets/v_3.mp4'),
    require('./assets/v_4.mp4'),
  ]

  const videoAspectRatios = [
    2,
    1,
    1,
    1,
    1,
  ]

  const videoName = [
    'Idle Video',
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
      video[index].play()  // Play the new video

      console.log('Switched to video texture:', videoName[index])
    }

    switchTexture(4)  // Start with the first video texture

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

    function resolve(gltf) {
      // Add the loaded model to the scene
      model = gltf.scene
      model.visible = false
      scene.add(model)
      console.log('Model loaded:', model)

      // Video Texture
      model.traverse((child) => {
        if (child.isMesh && child.material && child.material.name === 'Display') {
          child.material = videoMaterial
        }
      })

      // Set up the AnimationMixer and play all animations
      mixer = new THREE.AnimationMixer(model)
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play()
        mixer.clipAction(clip).setLoop(THREE.LoopOnce)
        mixer.clipAction(clip).clampWhenFinished = true  // Clamp the animation
      })
    }

    loader.load(sceneModel,
      (gltf) => {
        resolve(gltf)
      },
      undefined,

      (xhr) => {
      },

      (error) => {
      })

    // ================================= Animation - loop ================================

    function animate() {
      requestAnimationFrame(animate)
      if (mixer) {
        const delta = clock.getDelta()
        mixer.update(delta)
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

    // =================================

    // // create the video element
    // video = document.createElement('video')
    // video.src = videoFile
    // video.setAttribute('preload', 'auto')
    // video.setAttribute('loop', '')
    // video.setAttribute('muted', '')
    // video.setAttribute('playsinline', '')
    // video.setAttribute('webkit-playsinline', '')

    // const texture = new THREE.VideoTexture(video)
    // texture.minFilter = THREE.LinearFilter
    // texture.magFilter = THREE.LinearFilter
    // texture.format = THREE.RGBFormat
    // texture.crossOrigin = 'anonymous'

    // videoObj = new THREE.Mesh(
    //   new THREE.PlaneGeometry(0.75, 1),
    //   new THREE.MeshBasicMaterial({map: texture})
    // )
    // // Hide video until image target is detected.
    // videoObj.visible = false
    // scene.add(videoObj)
    // video.load()

    // // Set the initial camera position relative to the scene we just laid out. This must be at a
    // // height greater than y=0.
    // camera.position.set(0, 3, 0)
  }

  // Places content over image target
  const showTarget = ({detail}) => {
    // When the image target named 'model-target' is detected, show 3D model.
    // This string must match the name of the image target uploaded to 8th Wall.
    if (detail.name === 'protean-target-test') {
      model.position.copy(detail.position)
      model.quaternion.copy(detail.rotation)
      model.rotateX(1.5707963268)
      model.scale.set(
        detail.scale * modelScale, detail.scale * modelScale, detail.scale * modelScale
      )
      model.visible = true
    }
    // When the image target named 'video-target' is detected, play video.
    // This string must match the name of the image target uploaded to 8th Wall.
  }

  // Hides the image frame when the target is no longer detected.
  const hideTarget = ({detail}) => {
    if (detail.name === 'protean-target-test') {
      model.visible = false
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
