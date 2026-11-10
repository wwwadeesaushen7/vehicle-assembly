// Babylon modular builds require explicit ray registration for mesh picking.
import "@babylonjs/core/Culling/ray";
import "@babylonjs/core/Rendering/outlineRenderer";
import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { PointerDragBehavior } from "@babylonjs/core/Behaviors/Meshes/pointerDragBehavior";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { ReflectionProbe } from "@babylonjs/core/Probes/reflectionProbe";
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";
import { parts } from "../content/vehicles";
import { placementFor, type Assembly } from "../game/assembly";
import type { Transform } from "../content/schema";
import type { Preferences } from "../persistence/save";
import { materials } from "./materials";
import { buildPart } from "./vehicle";
export interface SceneActions {
  focus: () => void;
  resetCamera: () => void;
  zoom: (amount: number) => void;
  camera: () => Preferences["camera"];
  restoreCamera: (saved: Preferences["camera"]) => void;
}
export interface WorkshopProps {
  assembly: Assembly;
  selected: string | null;
  preferences: Preferences;
  showcase: boolean;
  exploded: boolean;
  moveMode: boolean;
  lift: boolean;
  testing: boolean;
  drive: { throttle: number; steer: number };
  onSelect: (id: string) => void;
  onMove: (id: string, t: Transform) => void;
  onReady: (actions: SceneActions) => void;
  onSpeed: (speed: number) => void;
  onError: (message: string) => void;
}
export default function Workshop(props: WorkshopProps) {
  const canvas = useRef<HTMLCanvasElement>(null),
    current = useRef(props),
    sync = useRef<() => void>(() => {});
  current.current = props;
  useEffect(() => {
    const el = canvas.current!;
    let engine: Engine;
    try {
      engine = new Engine(el, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      });
    } catch {
      current.current.onError(
        "WebGL could not start. Enable hardware acceleration and reload.",
      );
      return;
    }
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.07, 0.085, 0.08, 1);
    scene.ambientColor = new Color3(0.08, 0.08, 0.08);
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = 1;
    const saved = current.current.preferences.camera;
    const camera = new ArcRotateCamera(
      "Workshop camera",
      saved.alpha,
      saved.beta,
      saved.radius,
      Vector3.FromArray(saved.target),
      scene,
    );
    camera.attachControl(el, true);
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 20;
    camera.lowerBetaLimit = 0.12;
    camera.upperBetaLimit = 1.5;
    camera.wheelDeltaPercentage = 0.012;
    camera.pinchDeltaPercentage = 0.008;
    camera.useNaturalPinchZoom = true;
    camera.panningSensibility = 90;
    camera.inertia = 0.82;
    camera.minZ = 0.1;
    camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    const ambient = new HemisphericLight(
      "Soft bounce",
      new Vector3(0, 1, 0),
      scene,
    );
    ambient.intensity = 1.4;
    ambient.groundColor = new Color3(0.2, 0.23, 0.22);
    const sun = new DirectionalLight(
      "Workshop skylight",
      new Vector3(0.7, -1, 0.35),
      scene,
    );
    sun.position.set(-5, 9, -5);
    sun.intensity = 2.7;
    const shadows = new ShadowGenerator(2048, sun);
    shadows.useBlurExponentialShadowMap = true;
    shadows.blurKernel = 16;
    shadows.darkness = 0.3;
    const palette = materials(scene);
    palette.paint.clearCoat.isEnabled = true;
    palette.paint.clearCoat.intensity = 1;
    const gray = new PBRMaterial("Concrete", scene);
    gray.albedoColor = Color3.FromHexString("#3b4442");
    gray.roughness = 0.93;
    gray.metallic = 0.05;
    const wallMat = gray.clone("Wall paint");
    const cabinetMat = palette.paint.clone("Cabinet paint");
    const garage: Mesh[] = [];
    const box = (
      name: string,
      size: number[],
      position: number[],
      material = gray,
    ) => {
      const b = MeshBuilder.CreateBox(
        name,
        { width: size[0], height: size[1], depth: size[2] },
        scene,
      );
      b.position = Vector3.FromArray(position);
      b.material = material;
      b.receiveShadows = true;
      b.isPickable = false;
      garage.push(b);
      return b;
    };
    const floor = MeshBuilder.CreateGround(
      "Workshop floor",
      { width: 60, height: 60 },
      scene,
    );
    floor.material = gray;
    floor.receiveShadows = true;
    floor.isPickable = false;
    const gridMat = new StandardMaterial("Floor markings", scene);
    gridMat.diffuseColor = Color3.FromHexString("#626d66");
    gridMat.alpha = 0.25;
    const floorLines: Mesh[] = [];
    for (let i = -12; i <= 12; i++) {
      for (const axis of [0, 1]) {
        const line = MeshBuilder.CreateBox(
          "Expansion joint",
          { width: axis ? 24 : 0.012, height: 0.002, depth: axis ? 0.012 : 24 },
          scene,
        );
        line.position.set(axis ? 0 : i, 0.006, axis ? i : 0);
        line.material = gridMat;
        line.isPickable = false;
        floorLines.push(line);
      }
    }
    box("Back wall", [15, 5, 0.18], [0, 2.5, 5.2], wallMat);
    box("Left return", [0.18, 5, 12], [7.2, 2.5, 0], wallMat);
    box("Wall dado", [15, 0.09, 0.025], [0, 1.3, 5.09], palette.orange);
    // A large original typographic workshop plaque.
    const sign = MeshBuilder.CreatePlane(
      "Workshop sign",
      { width: 4.3, height: 0.95 },
      scene,
    );
    sign.position.set(-1.7, 3.3, 5.08);
    const tex = new DynamicTexture(
      "Original workshop lettering",
      { width: 1024, height: 256 },
      scene,
      false,
    );
    const ctx = tex.getContext();
    ctx.fillStyle = "#333f3d";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.font = "bold 118px sans-serif";
    ctx.fillStyle = "#b2b8a7";
    ctx.fillText("FORMWORKS", 25, 143);
    ctx.font = "24px monospace";
    ctx.fillText("PRECISION • PATIENCE • PROGRESS", 30, 208);
    tex.update();
    const signMat = new StandardMaterial("Workshop sign", scene);
    signMat.diffuseTexture = tex;
    signMat.emissiveColor = new Color3(0.3, 0.3, 0.3);
    sign.material = signMat;
    sign.isPickable = false;
    garage.push(sign);
    box("Workbench", [3.2, 0.12, 0.8], [-3.7, 1.02, 4.5], palette.steel);
    for (const x of [-5, -2.4])
      box("Bench leg", [0.09, 1, 0.6], [x, 0.5, 4.5], palette.dark);
    box("Tool chest", [1.2, 0.88, 0.7], [2.1, 0.48, 4.5], cabinetMat);
    for (let i = 0; i < 5; i++)
      box(
        "Drawer pull",
        [0.9, 0.025, 0.045],
        [2.1, 0.19 + i * 0.15, 4.13],
        palette.alloy,
      );
    for (const x of [1.65, 2.55])
      for (const z of [4.25, 4.75])
        box("Caster", [0.1, 0.12, 0.1], [x, 0.07, z], palette.rubber);
    for (let i = 0; i < 5; i++)
      box(
        "Parts bin",
        [0.36, 0.27, 0.35],
        [-4.7 + i * 0.53, 1.2, 4.5],
        i % 2 ? palette.dark : palette.orange,
      );
    for (const x of [4.4, 6.4])
      box("Rack upright", [0.07, 2.8, 0.7], [x, 1.4, 4.65], palette.steel);
    for (const y of [0.25, 1.1, 2, 2.8])
      box("Rack shelf", [2.05, 0.06, 0.85], [5.4, y, 4.65], palette.dark);
    for (const x of [4.8, 5.5, 6])
      box("Storage case", [0.48, 0.45, 0.5], [x, 1.35, 4.65], palette.leather);
    for (const x of [-4, 0, 4]) {
      box("Ceiling lamp", [2.4, 0.055, 0.18], [x, 4.6, 1.3], palette.light);
      box("Ceiling beam", [0.1, 0.13, 10], [x, 4.8, 0], palette.dark);
    }
    const platform = box(
      "Lift platform",
      [2.7, 0.1, 5.1],
      [0, 0.05, 0],
      palette.dark,
    );
    for (const x of [-1.38, 1.38])
      box("Bay stripe", [0.035, 0.005, 5.5], [x, 0.012, 0], palette.orange);
    const vehicle = new Mesh("Vehicle root", scene);
    const meshes = new Map<string, Mesh>();
    for (const p of parts) {
      const root = buildPart(
        p,
        scene,
        palette,
        current.current.preferences.quality === "Low",
      );
      root.parent = vehicle;
      meshes.set(p.id, root);
      root.getChildMeshes().forEach((mesh) => {
        shadows.addShadowCaster(mesh);
        mesh.receiveShadows = true;
      });
    }
    const ghostMat = new StandardMaterial("Mount preview", scene);
    ghostMat.diffuseColor = new Color3(0.4, 0.85, 0.7);
    ghostMat.emissiveColor = new Color3(0.1, 0.4, 0.25);
    ghostMat.alpha = 0.17;
    ghostMat.wireframe = true;
    let ghost: Mesh | null = null,
      ghostId: string | null = null;
    let pipeline: DefaultRenderingPipeline | null = null,
      ao: SSAO2RenderingPipeline | null = null,
      lastQuality = "";
    const probe = new ReflectionProbe("Workshop reflections", 128, scene);
    probe.position.set(0, 1.5, 0);
    probe.renderList = [floor, ...garage];
    probe.refreshRate = 0;
    scene.environmentTexture = probe.cubeTexture;
    let dragId: string | null = null;
    const dragBehaviors = new Map<string, PointerDragBehavior>();
    for (const [id, root] of meshes) {
      const behavior = new PointerDragBehavior({
        dragPlaneNormal: Vector3.Up(),
      });
      behavior.enabled = false;
      behavior.moveAttached = false;
      behavior.useObjectOrientationForDragging = false;
      behavior.onDragStartObservable.add(() => {
        dragId = id;
      });
      behavior.onDragObservable.add((event) => {
        root.position.addInPlace(event.delta);
        root.position.x = Math.max(-6, Math.min(6, root.position.x));
        root.position.z = Math.max(-6, Math.min(6, root.position.z));
      });
      behavior.onDragEndObservable.add(() => {
        const p = current.current;
        p.onMove(id, {
          position: root.position.asArray() as [number, number, number],
          rotation: placementFor(p.assembly, id).rotation,
        });
        dragId = null;
      });
      root.addBehavior(behavior);
      dragBehaviors.set(id, behavior);
    }
    scene.onPointerObservable.add((info) => {
      if (info.type !== PointerEventTypes.POINTERDOWN || multiTouch) return;
      const id = info.pickInfo?.pickedMesh?.metadata?.partId;
      if (id) current.current.onSelect(id);
    });
    // Handle multi-touch in CSS pixels so pan/zoom behave consistently in WebViews.
    const touches = new Map<number, { x: number; y: number }>();
    let multiTouch = false,
      pinchDistance = 0,
      midpoint = { x: 0, y: 0 };
    const metrics = () => {
      const [a, b] = [...touches.values()];
      return {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    };
    const touchDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        for (const behavior of dragBehaviors.values()) {
          if (behavior.dragging) behavior.releaseDrag();
          behavior.enabled = false;
        }
        camera.detachControl();
        multiTouch = true;
        const m = metrics();
        pinchDistance = m.distance;
        midpoint = m.middle;
      }
      if (multiTouch) {
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    };
    const touchMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!multiTouch) return;
      if (touches.size >= 2) {
        const m = metrics();
        if (m.distance > 1 && pinchDistance > 1)
          camera.radius = Math.max(
            3,
            Math.min(20, (camera.radius * pinchDistance) / m.distance),
          );
        const scale = camera.radius / Math.max(el.clientHeight, 1);
        const right = camera
          .getDirection(Vector3.Right())
          .scale(-(m.middle.x - midpoint.x) * scale);
        const up = camera
          .getDirection(Vector3.Up())
          .scale((m.middle.y - midpoint.y) * scale);
        camera.setTarget(camera.target.add(right).add(up));
        pinchDistance = m.distance;
        midpoint = m.middle;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const touchUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      touches.delete(e.pointerId);
      if (multiTouch) {
        e.preventDefault();
        if (touches.size === 0) {
          multiTouch = false;
          camera.attachControl(el, true);
          sync.current();
        }
      }
    };
    const clearTouches = () => {
      if (multiTouch) camera.attachControl(el, true);
      touches.clear();
      multiTouch = false;
    };
    el.addEventListener("pointerdown", touchDown, {
      capture: true,
      passive: false,
    });
    el.addEventListener("pointermove", touchMove, {
      capture: true,
      passive: false,
    });
    el.addEventListener("pointerup", touchUp, {
      capture: true,
      passive: false,
    });
    el.addEventListener("pointercancel", touchUp, {
      capture: true,
      passive: false,
    });
    window.addEventListener("blur", clearTouches);
    let wasTesting = false,
      speed = 0,
      heading = 0,
      frame = 0,
      lastExploded = false;
    sync.current = () => {
      const p = current.current;
      wallMat.albedoColor = Color3.FromHexString(p.preferences.garage.wall);
      cabinetMat.albedoColor = Color3.FromHexString(
        p.preferences.garage.cabinet,
      );
      ambient.intensity = 0.65 * p.preferences.garage.lighting;
      sun.intensity = 1.5 * p.preferences.garage.lighting;
      gray.roughness = p.preferences.garage.floor === "epoxy" ? 0.32 : 0.9;
      gray.albedoColor = Color3.FromHexString(
        p.preferences.garage.floor === "tiles"
          ? "#404a42"
          : p.preferences.garage.floor === "epoxy"
            ? "#233831"
            : "#2d362f",
      );
      floorLines.forEach((x) =>
        x.setEnabled(p.preferences.garage.floor !== "epoxy"),
      );
      vehicle.position.y = p.lift ? 0.6 : 0.08;
      platform.position.y = p.lift ? 0.64 : 0.05;
      garage.forEach((x) => x.setEnabled(!p.testing));
      if (p.testing !== wasTesting) {
        speed = 0;
        heading = 0;
        vehicle.position.x = 0;
        vehicle.position.z = 0;
        vehicle.rotation.y = 0;
        wasTesting = p.testing;
        camera.radius = p.testing ? 8 : 8.7;
      }
      for (const def of parts) {
        const root = meshes.get(def.id)!;
        const installed = p.assembly.installed.includes(def.id);
        dragBehaviors.get(def.id)!.enabled =
          p.moveMode &&
          !multiTouch &&
          p.selected === def.id &&
          !installed &&
          !p.exploded &&
          !p.showcase &&
          !p.testing;
        root.setEnabled(p.showcase || installed || p.selected === def.id);
        const t =
          installed || p.showcase
            ? def.mount
            : placementFor(p.assembly, def.id);
        if (dragId !== def.id) root.position = Vector3.FromArray(t.position);
        root.rotation.y = (t.rotation * Math.PI) / 180;
        if (p.exploded && (installed || p.showcase) && def.id !== "frame") {
          root.position.y +=
            def.category === "Body"
              ? 2.1
              : def.category === "Interior"
                ? 1.2
                : 0.35;
          root.position.x += def.side ? def.side * 1.1 : 0;
          root.position.z += def.category === "Powertrain" ? -0.5 : 0;
        }
        root.getChildMeshes().forEach((mesh) => {
          mesh.renderOutline = p.selected === def.id && !p.showcase;
          mesh.outlineColor = Color3.FromHexString("#ef9f60");
          mesh.outlineWidth = 0.015;
        });
      }
      const needed =
        p.selected &&
        !p.assembly.installed.includes(p.selected) &&
        !p.showcase &&
        !p.exploded
          ? p.selected
          : null;
      if (needed !== ghostId) {
        ghost?.dispose();
        ghost = null;
        ghostId = needed;
        if (needed) {
          const def = parts.find((d) => d.id === needed)!;
          ghost = buildPart(def, scene, palette, true);
          ghost.parent = vehicle;
          ghost.position = Vector3.FromArray(def.mount.position);
          ghost.getChildMeshes().forEach((mesh) => {
            mesh.material = ghostMat;
            mesh.isPickable = false;
          });
        }
      }
      if (p.exploded !== lastExploded) {
        lastExploded = p.exploded;
        camera.radius = p.exploded ? 11.5 : 8.7;
        camera.setTarget(
          vehicle.position.add(new Vector3(0, p.exploded ? 1.8 : 0.9, 0)),
        );
      }
      const q = p.preferences.quality;
      if (q !== lastQuality) {
        lastQuality = q;
        pipeline?.dispose();
        pipeline = null;
        ao?.dispose();
        ao = null;
        engine.setHardwareScalingLevel(
          q === "Low"
            ? Math.max(1.5, window.devicePixelRatio)
            : q === "Medium"
              ? 1.25
              : 1,
        );
        shadows
          .getShadowMap()!
          .resize(q === "Ultra" ? 2048 : q === "High" ? 1024 : 512);
        sun.shadowEnabled = q !== "Low";
        if (q !== "Low") {
          pipeline = new DefaultRenderingPipeline(
            "Post processing",
            true,
            scene,
            [camera],
          );
          pipeline.fxaaEnabled = true;
          pipeline.samples = q === "Ultra" ? 4 : 1;
          pipeline.bloomEnabled = true;
          pipeline.bloomWeight = 0.13;
          pipeline.imageProcessing.contrast = 1.15;
          pipeline.imageProcessing.exposure = 1.05;
        }
        if (q === "Ultra" && engine.webGLVersion === 2) {
          ao = new SSAO2RenderingPipeline(
            "Ambient occlusion",
            scene,
            { ssaoRatio: 0.5, blurRatio: 0.5 },
            [camera],
          );
          ao.radius = 0.8;
          ao.totalStrength = 0.65;
        }
      }
    };
    current.current.onReady({
      focus: () => {
        const id = current.current.selected;
        camera.setTarget(
          id
            ? meshes.get(id)!.getAbsolutePosition()
            : vehicle.position.add(new Vector3(0, 0.9, 0)),
        );
        camera.radius = id ? 4.5 : 8.7;
      },
      resetCamera: () => {
        camera.alpha = -2.25;
        camera.beta = 1.13;
        camera.radius = 8.7;
        camera.setTarget(vehicle.position.add(new Vector3(0, 0.9, 0)));
      },
      zoom: (amount) => {
        camera.radius = Math.max(3, Math.min(20, camera.radius + amount));
      },
      restoreCamera: (saved) => {
        camera.alpha = saved.alpha;
        camera.beta = saved.beta;
        camera.radius = saved.radius;
        camera.setTarget(Vector3.FromArray(saved.target));
      },
      camera: () => ({
        alpha: camera.alpha,
        beta: camera.beta,
        radius: camera.radius,
        target: camera.target.asArray() as [number, number, number],
      }),
    });
    sync.current();
    engine.runRenderLoop(() => {
      const p = current.current;
      const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
      if (p.testing) {
        speed += (p.drive.throttle * 3.5 - speed * 0.5) * dt;
        speed = Math.max(-2, Math.min(7, speed));
        heading += p.drive.steer * speed * 0.2 * dt;
        vehicle.rotation.y = heading;
        vehicle.position.x -= Math.sin(heading) * speed * dt;
        vehicle.position.z -= Math.cos(heading) * speed * dt;
        if (
          Math.abs(vehicle.position.x) > 20 ||
          Math.abs(vehicle.position.z) > 20
        ) {
          vehicle.position.x = Math.max(-20, Math.min(20, vehicle.position.x));
          vehicle.position.z = Math.max(-20, Math.min(20, vehicle.position.z));
          speed = 0;
        }
        camera.setTarget(vehicle.position.add(new Vector3(0, 0.9, 0)));
        for (const def of parts.filter((d) => d.shape === "wheel"))
          meshes.get(def.id)!.rotation.x += (speed * dt) / 0.6;
        if (++frame % 6 === 0) p.onSpeed(Math.round(Math.abs(speed) * 3.6));
      }
      scene.render();
    });
    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    const lost = (e: Event) => {
      e.preventDefault();
      current.current.onError(
        "Graphics context lost. Save your project, then reload with Low graphics.",
      );
    };
    el.addEventListener("webglcontextlost", lost);
    return () => {
      el.removeEventListener("pointerdown", touchDown, true);
      el.removeEventListener("pointermove", touchMove, true);
      el.removeEventListener("pointerup", touchUp, true);
      el.removeEventListener("pointercancel", touchUp, true);
      window.removeEventListener("blur", clearTouches);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      el.removeEventListener("webglcontextlost", lost);
      scene.dispose();
      engine.dispose();
    };
  }, []);
  useEffect(
    () => sync.current(),
    [
      props.assembly,
      props.selected,
      props.preferences,
      props.showcase,
      props.exploded,
      props.moveMode,
      props.lift,
      props.testing,
    ],
  );
  return (
    <canvas
      ref={canvas}
      className="scene-canvas"
      aria-label="Interactive 3D vehicle workshop. Drag to orbit, scroll or pinch to zoom. Use the parts panel to select and position components."
      tabIndex={0}
    />
  );
}
