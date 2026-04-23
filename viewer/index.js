import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { PointerLockControls } from "./vendor/PointerLockControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

const CACHE_VERSION = "spark2-20260423-fix4";
const SPLAT_URL = `../assets/ply/spark/point_cloud-lod.rad?v=${CACHE_VERSION}`;
const MOBILE_QUERY = "(pointer: coarse), (max-width: 720px)";
const SCENE_BOUNDS = {
  center: new THREE.Vector3(-0.78407, -1.1236, 0.790845),
  size: new THREE.Vector3(8.089123, 2.769331, 5.899971),
};

const canvas = document.querySelector("#viewer");
const statusText = document.querySelector("#statusText");
const statusDetail = document.querySelector("#statusDetail");
const progressBar = document.querySelector("#progressBar");
const resetButton = document.querySelector("#resetView");
const walkButton = document.querySelector("#walkToggle");
const qualityButton = document.querySelector("#qualityToggle");
const walkPrompt = document.querySelector("#walkPrompt");

progressBar.classList.add("is-loading");
statusText.textContent = "Starting Spark 2.0 viewer...";
statusDetail.textContent = "Loading runtime modules and preparing the streamable LoD scene.";

window.addEventListener("error", (event) => {
  showFatalError(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  showFatalError(event.reason);
});

const isMobile = window.matchMedia(MOBILE_QUERY).matches;
const qualityPresets = {
  high: {
    label: "Quality: High",
    lodSplatScale: isMobile ? 1.15 : 2.15,
    lodRenderScale: 1.15,
  },
  balanced: {
    label: "Quality: Balanced",
    lodSplatScale: isMobile ? 0.85 : 1.35,
    lodRenderScale: 1.55,
  },
};

let qualityMode = "high";
let walkModeRequested = false;
let initialCameraState = null;
let dirty = true;
let headerReady = false;
let firstChunksReady = false;
const streamedChunks = new Set();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b11);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(0, 1.5, 4);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(scene.background, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.35 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const spark = new SparkRenderer({
  renderer,
  enableLod: true,
  enableLodFetching: true,
  pagedExtSplats: true,
  maxPixelRadius: 768,
  minSortIntervalMs: 50,
  sortRadial: false,
  onDirty: () => {
    dirty = true;
  },
  ...qualityPresets[qualityMode],
});
scene.add(spark);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.08;
orbitControls.screenSpacePanning = true;
orbitControls.zoomToCursor = true;

const walkControls = new PointerLockControls(camera, renderer.domElement);
const pressedKeys = new Set();
const clock = new THREE.Clock();

const splatMesh = new SplatMesh({
  url: SPLAT_URL,
  paged: true,
  enableLod: true,
  lodScale: 1,
  onProgress: (event) => {
    if (event.lengthComputable && event.total > 0) {
      const percent = Math.min(95, Math.round((event.loaded / event.total) * 100));
      progressBar.classList.remove("is-loading");
      progressBar.style.width = `${percent}%`;
      statusText.textContent = `Loading Spark LoD header... ${percent}%`;
      statusDetail.textContent = "Visible Gaussian chunks will stream automatically while you move.";
    }
  },
  onLoad: () => {
    headerReady = true;
    progressBar.classList.add("is-loading");
    progressBar.style.width = "";
    statusText.textContent = "Spark LoD header ready";
    statusDetail.textContent = "Fetching the first visible Gaussian chunks for the initial view.";
    updateStreamingStatus(performance.getEntriesByType("resource"));
  },
});

scene.add(splatMesh);
setStatus(
  "Streaming Spark LoD scene...",
  "The LoD header is loading first; visible Gaussian chunks will stream as the camera settles."
);

function setStatus(message, detail) {
  statusText.textContent = message;
  if (detail) {
    statusDetail.textContent = detail;
  }
}

function updateStreamingStatus(entries = []) {
  for (const entry of entries) {
    if (entry.name?.includes(".radc")) {
      streamedChunks.add(entry.name);
    }
  }

  if (!headerReady || firstChunksReady || streamedChunks.size === 0) {
    return;
  }

  if (streamedChunks.size < 4) {
    setStatus(
      "Rendering first visible chunks...",
      "The scene appears as soon as the first Gaussian chunks reach the GPU."
    );
    return;
  }

  firstChunksReady = true;
  progressBar.classList.remove("is-loading");
  progressBar.style.width = "100%";
  setStatus("Spark viewer ready", "Drag to orbit, right-drag to pan, scroll to zoom, or switch to Walk Mode.");
}

if ("PerformanceObserver" in window) {
  const resourceObserver = new PerformanceObserver((list) => {
    updateStreamingStatus(list.getEntries());
  });
  resourceObserver.observe({ type: "resource", buffered: true });
}

function showFatalError(error) {
  console.error(error);
  progressBar.classList.remove("is-loading");
  progressBar.classList.add("is-error");
  progressBar.style.width = "100%";
  setStatus("Viewer initialization failed", "The browser reported an error while starting Spark. Please refresh once, or send us the console message.");
}

function applyCameraFrame(center, size) {
  const radius = Math.max(size.x, size.y, size.z, 1);

  camera.near = Math.max(radius / 10000, 0.005);
  camera.far = Math.max(radius * 24, 100);
  camera.position.set(
    center.x + radius * 0.04,
    center.y + Math.max(size.y * 0.25, radius * 0.16),
    center.z + radius * 0.9
  );
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  orbitControls.target.copy(center);
  orbitControls.minDistance = radius * 0.01;
  orbitControls.maxDistance = radius * 4.5;
  initialCameraState = {
    position: camera.position.clone(),
    target: center.clone(),
  };
}

function frameScene() {
  try {
    const box = splatMesh.getBoundingBox(true);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    applyCameraFrame(center, size);
  } catch (error) {
    applyCameraFrame(SCENE_BOUNDS.center, SCENE_BOUNDS.size);
  }

  orbitControls.update();
  dirty = true;
}

function resetView() {
  if (!initialCameraState) {
    frameScene();
    return;
  }

  camera.position.copy(initialCameraState.position);
  orbitControls.target.copy(initialCameraState.target);
  camera.lookAt(initialCameraState.target);
  camera.updateProjectionMatrix();
  orbitControls.update();
  dirty = true;
}

function setQuality(nextMode) {
  qualityMode = nextMode;
  const preset = qualityPresets[qualityMode];
  spark.lodSplatScale = preset.lodSplatScale;
  spark.lodRenderScale = preset.lodRenderScale;
  qualityButton.textContent = preset.label;
  spark.setDirty();
  dirty = true;
}

function setWalkUi(isLocked) {
  walkButton.classList.toggle("is-active", isLocked);
  walkButton.textContent = isLocked ? "Orbit Mode" : "Walk Mode";
  walkPrompt.hidden = !walkModeRequested || isLocked;
}

function updateWalk(deltaTime) {
  if (!walkControls.isLocked) {
    return;
  }

  const boost = pressedKeys.has("ShiftLeft") || pressedKeys.has("ShiftRight") ? 3.0 : 1.0;
  const speed = (pressedKeys.has("AltLeft") || pressedKeys.has("AltRight") ? 0.7 : 1.8) * boost;
  const distance = speed * deltaTime;

  const forward = Number(pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp")) -
    Number(pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown"));
  const right = Number(pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight")) -
    Number(pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft"));
  const vertical = Number(pressedKeys.has("KeyE") || pressedKeys.has("Space")) -
    Number(pressedKeys.has("KeyQ") || pressedKeys.has("ControlLeft") || pressedKeys.has("ControlRight"));

  if (forward !== 0) {
    walkControls.moveForward(forward * distance);
  }
  if (right !== 0) {
    walkControls.moveRight(right * distance);
  }
  if (vertical !== 0) {
    camera.position.y += vertical * distance;
  }
  if (forward !== 0 || right !== 0 || vertical !== 0) {
    dirty = true;
  }
}

function animate() {
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  orbitControls.enabled = !walkControls.isLocked;

  if (orbitControls.enabled) {
    orbitControls.update();
  }
  updateWalk(deltaTime);

  renderer.render(scene, camera);
  dirty = false;
  requestAnimationFrame(animate);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.35 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  spark.setDirty();
  dirty = true;
}

resetButton.addEventListener("click", resetView);

qualityButton.addEventListener("click", () => {
  setQuality(qualityMode === "high" ? "balanced" : "high");
});

walkButton.addEventListener("click", () => {
  if (walkControls.isLocked) {
    walkControls.unlock();
    return;
  }
  walkModeRequested = true;
  walkPrompt.hidden = false;
  renderer.domElement.focus();
  walkControls.lock();
});

walkControls.addEventListener("lock", () => {
  walkModeRequested = true;
  setWalkUi(true);
  setStatus("Walk mode enabled", "Use WASD + mouse to roam. Press Esc to return to orbit mode.");
});

walkControls.addEventListener("unlock", () => {
  walkModeRequested = false;
  pressedKeys.clear();
  setWalkUi(false);
  setStatus("Orbit mode enabled", "Drag to orbit, right-drag to pan, and scroll to zoom.");
});

window.addEventListener("keydown", (event) => {
  pressedKeys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.code);
});

window.addEventListener("resize", resize);

splatMesh.initialized
  .then(() => {
    headerReady = true;
    progressBar.classList.add("is-loading");
    progressBar.style.width = "";
    setStatus("Spark LoD header ready", "Fetching the first visible Gaussian chunks for the initial view.");
    frameScene();
    updateStreamingStatus(performance.getEntriesByType("resource"));
  })
  .catch((error) => {
    console.error(error);
    progressBar.classList.remove("is-loading");
    progressBar.classList.add("is-error");
    progressBar.style.width = "100%";
    setStatus("Unable to load the Spark scene", "Please refresh the page or check the browser console.");
  });

setQuality(qualityMode);
animate();

window.yogoViewer = {
  THREE,
  camera,
  scene,
  spark,
  splatMesh,
  orbitControls,
  resetView,
};
