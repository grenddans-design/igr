import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const container = document.getElementById("coreGlyphBox");
const canvas = document.getElementById("robot3dCanvas");
const fallbackImg = document.getElementById("coreGlyphImg");
const fallbackIcon = container ? container.querySelector("i") : null;

if (container && canvas && window.WebGLRenderingContext) {
  initRobot3D();
}

function initRobot3D() {
  let renderer, scene, camera, modelGroup, spinSpeed = 0.006;
  let dragging = false, lastX = 0, lastY = 0, moved = 0, downTime = 0;
  let kick = 0;

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  } catch (e) {
    console.warn("WebGL init failed, keeping flat image fallback", e);
    return;
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight(0x88aaff, 0.65));
  const key = new THREE.DirectionalLight(0x6fd7ff, 1.3);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9b7dff, 1.1);
  rim.position.set(-4, -2, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-2, 3, -4);
  scene.add(fill);

  modelGroup = new THREE.Group();
  scene.add(modelGroup);

  function sizeRenderer() {
    const w = container.clientWidth || 230;
    const h = container.clientHeight || 230;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const loader = new GLTFLoader();
  loader.load(
    "assets/models/nexorum_ai_drone.glb",
    gltf => {
      const model = gltf.scene;

      model.traverse(node => {
        if (node.isMesh) {
          node.material = new THREE.MeshStandardMaterial({
            color: 0xcdd7e8,
            metalness: 0.75,
            roughness: 0.32,
            emissive: 0x1b3a55,
            emissiveIntensity: 0.15,
          });
        }
      });

      // auto-frame the camera to the model's real bounding box
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      model.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const dist = (maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.65;
      camera.position.set(dist * 0.55, dist * 0.42, dist * 0.85);
      camera.lookAt(0, 0, 0);

      modelGroup.add(model);

      sizeRenderer();
      canvas.classList.add("show");
      if (fallbackImg) fallbackImg.classList.remove("show");
      if (fallbackIcon) fallbackIcon.classList.add("hide");

      animate();
    },
    undefined,
    err => {
      console.warn("3D model failed to load, keeping flat image fallback", err);
    }
  );

  function animate() {
    requestAnimationFrame(animate);
    if (!dragging) {
      modelGroup.rotation.y += spinSpeed;
    }
    if (kick > 0) {
      modelGroup.rotation.y += kick;
      modelGroup.scale.setScalar(1 + Math.abs(kick) * 4);
      kick *= 0.9;
      if (Math.abs(kick) < 0.0005) { kick = 0; modelGroup.scale.setScalar(1); }
    }
    renderer.render(scene, camera);
  }

  function onDown(x, y) {
    dragging = true; moved = 0; lastX = x; lastY = y; downTime = Date.now();
  }
  function onMove(x, y) {
    if (!dragging) return;
    const dx = x - lastX, dy = y - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    modelGroup.rotation.y += dx * 0.01;
    modelGroup.rotation.x = Math.max(-0.5, Math.min(0.5, modelGroup.rotation.x + dy * 0.01));
    lastX = x; lastY = y;
  }
  function onUp() {
    dragging = false;
    const wasTap = moved < 6 && (Date.now() - downTime) < 300;
    if (wasTap) {
      kick = 0.35;
      if (typeof window.onCoreTap === "function") window.onCoreTap();
    }
  }

  canvas.addEventListener("pointerdown", e => { canvas.setPointerCapture(e.pointerId); onDown(e.clientX, e.clientY); });
  canvas.addEventListener("pointermove", e => onMove(e.clientX, e.clientY));
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("click", e => e.stopPropagation());

  window.addEventListener("resize", sizeRenderer);
  sizeRenderer();
}
