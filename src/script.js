import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene, camera, renderer, controller, model;
let buttonPressed = false;
let currentRotationY = 0;
let currentRotationX = 0;
const rotationStep = Math.PI / 2; // 90 degrees
let rotationProgress = 0;
const easing = (t) => t * t * (3 - 2 * t);
let targetRotationY = 0;
let targetRotationX = 0;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.5, 2);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.getElementById("vrButton").addEventListener("click", () => {
    document.body.appendChild(VRButton.createButton(renderer));
  });

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const light = new THREE.DirectionalLight(0xffffff, 5);
  light.position.set(5, 10, 5);
  scene.add(light);

  window.addEventListener("resize", onWindowResize);
  document.getElementById("uploadButton").addEventListener("click", loadModel);

  controller = renderer.xr.getController(0);
  if (controller) {
    controller.addEventListener("selectstart", onButtonPress);
    controller.addEventListener("selectend", onButtonRelease);
    scene.add(controller);
  }
}

function loadModel() {
  const fileInput = document.getElementById("fileInput");
  if (fileInput.files.length === 0) {
    alert("Please select a .glb file first.");
    return;
  }

  const file = fileInput.files[0];
  const url = URL.createObjectURL(file);

  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      if (model) scene.remove(model);
      model = gltf.scene;
      model.position.set(0, 1.3, -4);
      scene.add(model);
      addInstructionPanels();
    },
    undefined,
    (error) => console.error("Error loading model:", error)
  );
}

function addInstructionPanels() {
  const panelData = [
    {
      text: "Look left and click",
      position: new THREE.Vector3(-1.5, 1.3, -2),
      borderColor: "red",
    },
    {
      text: "Look right and click",
      position: new THREE.Vector3(1.5, 1.3, -2),
      borderColor: "blue",
    },
    {
      text: "Look top and click",
      position: new THREE.Vector3(0, 2.5, -2),
      borderColor: "green",
    },
    {
      text: "Look bottom and click",
      position: new THREE.Vector3(0, 0.5, -2),
      borderColor: "yellow",
    },
  ];
  panelData.forEach(({ text, position, borderColor }) => {
    const textPanel = createTextPanel(text, borderColor);
    textPanel.position.copy(position);
    scene.add(textPanel);
  });
}

function createTextPanel(text, borderColor) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 256;
  canvas.height = 128;
  context.fillStyle = "transparent";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = borderColor;
  context.lineWidth = 5;
  context.strokeRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "white";
  context.font = "24px Arial";
  context.fillText(text, 20, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.5, 0.75, 1);
  return sprite;
}

function onButtonPress() {
  buttonPressed = true;
  updateRotationTarget();
}

function onButtonRelease() {
  buttonPressed = false;
}

function updateRotationTarget() {
  if (!model) return;

  const lookDirection = new THREE.Vector3();
  camera.getWorldDirection(lookDirection);

  if (Math.abs(lookDirection.x) > Math.abs(lookDirection.y)) {
    targetRotationY += lookDirection.x > 0 ? -rotationStep : rotationStep;
  } else {
    targetRotationX += lookDirection.y > 0 ? rotationStep : -rotationStep;
  }
  rotationProgress = 0;
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (model) {
      if (rotationProgress < 1) {
        rotationProgress += 0.02;
        let easedProgress = easing(rotationProgress);
        model.rotation.y =
          currentRotationY +
          easedProgress * (targetRotationY - currentRotationY);
        model.rotation.x =
          currentRotationX +
          easedProgress * (targetRotationX - currentRotationX);
      } else {
        currentRotationY = targetRotationY;
        currentRotationX = targetRotationX;
      }
    }
    renderer.render(scene, camera);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
