import { collectVehicle } from "../persistence/collection";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Crosshair,
  Expand,
  Layers3,
  Maximize2,
  Minus,
  Move3D,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Save as SaveIcon,
  Settings2,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Download,
  Upload,
  Undo2,
  Redo2,
  Search,
  CarFront,
  Gauge,
  Bolt,
  Box,
  Hammer,
  MousePointer2,
  BookOpen,
  Paintbrush,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { parts, partById, demoVehicle } from "../content/vehicles";
import { vehicleCategories } from "../content/schema";
import type { Tool, Transform } from "../content/schema";
import {
  canStart,
  commit,
  copy,
  diagnostics,
  fasten,
  initialAssembly,
  move,
  placementFor,
  prerequisites,
  redo,
  remove,
  snap,
  undo,
  type History,
  type Result,
} from "../game/assembly";
import {
  newSave,
  readSave,
  writeSave,
  decodeSave,
  SAVE_KEY,
  type Preferences,
  type Quality,
  type Save,
} from "../persistence/save";
import { playSound } from "../platform/audio";
import type { SceneActions } from "../rendering/Workshop";
const Workshop = lazy(() => import("../rendering/Workshop"));
type Modal =
  | "vehicles"
  | "settings"
  | "help"
  | "downloads"
  | "diagnostics"
  | "collection"
  | null;
type Mode = "Guided" | "Free assembly" | "Inspection";
const tools: { id: Tool; name: string; icon: ReactNode }[] = [
  { id: "hand", name: "Hand", icon: <MousePointer2 size={19} /> },
  { id: "wrench", name: "Wrench", icon: <Wrench size={19} /> },
  { id: "torque", name: "Torque wrench", icon: <Gauge size={19} /> },
  { id: "screwdriver", name: "Screwdriver", icon: <Hammer size={19} /> },
  { id: "jack", name: "Jack / lift", icon: <Layers3 size={19} /> },
];
function initial() {
  try {
    return {
      save: readSave(localStorage) ?? newSave(),
      error: "",
      exists: !!localStorage.getItem(SAVE_KEY),
    };
  } catch (e) {
    return {
      save: newSave(),
      error: `Saved project could not be loaded: ${(e as Error).message}`,
      exists: false,
    };
  }
}
function IconButton({
  label,
  children,
  onClick,
  active,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""}`}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export default function App() {
  const [boot] = useState(initial),
    [history, setHistory] = useState<History>({
      past: [],
      present: boot.save.assembly,
      future: [],
    });
  const [preferences, setPreferences] = useState<Preferences>(
      boot.save.preferences,
    ),
    [profile, setProfile] = useState(boot.save.profile);
  const [page, setPage] = useState<"home" | "workshop">("home"),
    [modal, setModal] = useState<Modal>(null),
    [mode, setMode] = useState<Mode>("Guided");
  const [selected, setSelected] = useState<string | null>("front-suspension"),
    [tool, setTool] = useState<Tool>("wrench"),
    [category, setCategory] = useState("All parts"),
    [search, setSearch] = useState("");
  const [exploded, setExploded] = useState(false),
    [moveMode, setMoveMode] = useState(false),
    [lift, setLift] = useState(false),
    [engineRunning, setEngineRunning] = useState(false),
    [testing, setTesting] = useState(false),
    [drive, setDrive] = useState({ throttle: 0, steer: 0 }),
    [speed, setSpeed] = useState(0);
  const [message, setMessage] = useState(boot.error),
    [messageKind, setMessageKind] = useState<"info" | "error">("info"),
    [saved, setSaved] = useState(boot.exists),
    [saveEnabled, setSaveEnabled] = useState(!boot.error),
    [saveStatus, setSaveStatus] = useState(
      boot.exists ? "Saved project available" : "New project",
    );
  const [sceneError, setSceneError] = useState(""),
    [mobilePanel, setMobilePanel] = useState<"parts" | "assembly" | null>(null),
    [installPrompt, setInstallPrompt] = useState<any>(null),
    [updateReady, setUpdateReady] = useState(false);
  const actions = useRef<SceneActions | null>(null),
    importRef = useRef<HTMLInputElement>(null),
    noticeTimer = useRef<number>(0);
  const state = history.present,
    part = selected ? partById[selected] : null,
    installed = !!selected && state.installed.includes(selected),
    completion = Math.round((state.installed.length / parts.length) * 100);
  const notify = (text: string, kind: "info" | "error" = "info") => {
    setMessage(text);
    setMessageKind(kind);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setMessage(""), 6000);
  };
  const snapshot = (): Save => ({
    version: 1,
    vehicleId: "fw-01",
    profile,
    assembly: state,
    preferences: {
      ...preferences,
      camera: actions.current?.camera() ?? preferences.camera,
    },
    savedAt: new Date().toISOString(),
  });
  const saveNow = (quiet = false) => {
    try {
      writeSave(localStorage, snapshot());
      setSaved(true);
      setSaveEnabled(true);
      setSaveStatus("All changes saved");
      if (!quiet) notify("Project saved on this device.");
    } catch (e) {
      setSaveStatus("Save failed");
      notify(
        `Could not save: ${(e as Error).message}. Export a backup.`,
        "error",
      );
    }
  };
  useEffect(() => {
    if (page !== "workshop" || !saveEnabled) return;
    setSaveStatus("Saving…");
    const t = setTimeout(() => saveNow(true), 700);
    return () => clearTimeout(t);
  }, [state, preferences, profile, page, saveEnabled]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]")!;
    const elements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select,a[href]",
        ),
      ).filter((el) => el.offsetParent !== null);
    elements()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        return;
      }
      if (e.key !== "Tab") return;
      const list = elements(),
        first = list[0],
        last = list.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modal]);
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const ready = () => setUpdateReady(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("formworks-update", ready);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("formworks-update", ready);
    };
  }, []);
  useEffect(() => {
    if (!canStart(state)) {
      setEngineRunning(false);
      setTesting(false);
    }
  }, [state]);
  useEffect(() => {
    const clear = () => setDrive({ throttle: 0, steer: 0 });
    window.addEventListener("blur", clear);
    return () => window.removeEventListener("blur", clear);
  }, []);
  const apply = (result: Result, success?: string) => {
    if (!result.ok) {
      notify(result.error, "error");
      return false;
    }
    setHistory((h) => commit(h, result.state));
    if (success) notify(success);
    return true;
  };
  const position = (t: Transform) => {
    if (!selected || mode === "Inspection" || testing) return;
    apply(move(state, selected, t));
  };
  const nudge = (axis: number, delta: number) => {
    if (!selected) return;
    const t = copy(placementFor(state, selected));
    t.position[axis] = Math.round((t.position[axis] + delta) * 100) / 100;
    position(t);
  };
  const rotate = (degrees: number) => {
    if (!selected) return;
    const t = copy(placementFor(state, selected));
    t.rotation = (t.rotation + degrees) % 360;
    position(t);
  };
  const fastenPart = () => {
    if (!part || mode === "Inspection") return;
    const r = fasten(state, part.id, tool);
    if (apply(r)) {
      playSound(
        r.ok && r.state.installed.includes(part.id) ? "install" : "bolt",
        preferences.sound,
      );
      if (r.ok && r.state.installed.includes(part.id))
        notify(`${part.name} installed.`);
    }
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).matches("input,select,textarea") ||
        modal ||
        page !== "workshop"
      )
        return;
      if (testing) {
        if (
          [
            "w",
            "s",
            "a",
            "d",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
          ].includes(e.key)
        ) {
          e.preventDefault();
          setDrive((d) => ({
            ...d,
            ...(["w", "ArrowUp"].includes(e.key)
              ? { throttle: 1 }
              : ["s", "ArrowDown"].includes(e.key)
                ? { throttle: -1 }
                : ["a", "ArrowLeft"].includes(e.key)
                  ? { steer: -1 }
                  : { steer: 1 }),
          }));
        }
        return;
      }
      if (e.key.toLowerCase() === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveNow();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (mode === "Inspection") {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        setHistory((h) => (e.shiftKey ? redo(h) : undo(h)));
        return;
      }
      if (e.key === "f") {
        actions.current?.focus();
        return;
      }
      if (mode === "Inspection" || installed) return;
      if (e.key === preferences.rotateKey) {
        rotate(15);
        e.preventDefault();
      }
      if (e.key === "ArrowLeft") {
        nudge(0, -0.1);
        e.preventDefault();
      }
      if (e.key === "ArrowRight") {
        nudge(0, 0.1);
        e.preventDefault();
      }
      if (e.key === "ArrowUp") {
        nudge(2, -0.1);
        e.preventDefault();
      }
      if (e.key === "ArrowDown") {
        nudge(2, 0.1);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (["w", "s", "ArrowUp", "ArrowDown"].includes(e.key))
        setDrive((d) => ({ ...d, throttle: 0 }));
      if (["a", "d", "ArrowLeft", "ArrowRight"].includes(e.key))
        setDrive((d) => ({ ...d, steer: 0 }));
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });
  const openProject = () => {
    setPage("workshop");
    setModal(null);
    setExploded(false);
    setTesting(false);
    setSaveEnabled(true);
  };
  const startNew = () => {
    if (
      saved &&
      !confirm(
        "Start a new project? This replaces the local project. Export a backup first if you want to keep it.",
      )
    )
      return;
    if (
      boot.error &&
      !confirm(
        "The existing save is unreadable. Replace it with a new project?",
      )
    )
      return;
    setHistory({ past: [], present: initialAssembly(), future: [] });
    setSelected("front-suspension");
    setEngineRunning(false);
    openProject();
  };
  const nextPart = parts.find(
    (p) =>
      !state.installed.includes(p.id) &&
      prerequisites(state, p.id).length === 0,
  );
  const visible = parts.filter(
    (p) =>
      (category === "All parts" || p.category === category) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const exportSave = () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formworks-fw01.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Project backup exported.");
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        notify(
          "Fullscreen is unavailable in this browser. Install the PWA for an app window.",
        );
    } catch {
      notify("Fullscreen was not allowed by this browser.", "error");
    }
  };
  const downloadWindows = import.meta.env.VITE_WINDOWS_DOWNLOAD_URL,
    downloadAndroid = import.meta.env.VITE_ANDROID_DOWNLOAD_URL;
  return (
    <div
      className={`app ${page === "home" ? "home" : "workshop"} ${testing ? "testing" : ""}`}
    >
      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            if (page === "workshop") saveNow(true);
            setPage("home");
            setTesting(false);
            setExploded(false);
          }}
          aria-label="Formworks home"
        >
          <span className="brand-symbol">
            F<span>_</span>
          </span>
          <span>
            FORMWORKS<small>VEHICLE ASSEMBLY</small>
          </span>
        </button>
        {page === "home" ? (
          <nav>
            <button onClick={() => setModal("vehicles")}>The collection</button>
            <button onClick={() => setModal("help")}>
              Field guide <ArrowUpRight size={14} />
            </button>
            <button onClick={() => setModal("downloads")}>
              Get the game <Download size={14} />
            </button>
          </nav>
        ) : (
          <div className="project-title">
            <span className="live-dot" />
            THE HOME WORKSHOP <span className="slash">/</span>
            <strong>FW-01</strong>
            <span className="edition">PROJECT 001</span>
          </div>
        )}
        <div className="top-actions">
          {page === "workshop" && (
            <>
              <span className="save-status">{saveStatus}</span>
              <IconButton label="Save project" onClick={() => saveNow()}>
                <SaveIcon size={18} />
              </IconButton>
            </>
          )}
          <IconButton label="Settings" onClick={() => setModal("settings")}>
            <Settings2 size={19} />
          </IconButton>
          <span className="version">
            v0.1.0 <i>EARLY ACCESS</i>
          </span>
        </div>
      </header>
      <main className="main-shell">
        <div className={`viewport ${page === "home" ? "showcase" : ""}`}>
          <Suspense
            fallback={
              <div className="loading">
                <span className="spinner" />
                Opening the workshop…
              </div>
            }
          >
            <Workshop
              assembly={state}
              selected={page === "home" ? null : selected}
              preferences={preferences}
              showcase={page === "home"}
              exploded={exploded}
              moveMode={moveMode && mode !== "Inspection"}
              lift={lift && page === "workshop"}
              testing={testing}
              drive={drive}
              onSelect={(id) => {
                if (page === "workshop") {
                  setSelected(id);
                  if (!moveMode) setMobilePanel("assembly");
                }
              }}
              onMove={(id, t) => {
                if (mode !== "Inspection") apply(move(state, id, t));
              }}
              onReady={(a) => (actions.current = a)}
              onSpeed={setSpeed}
              onError={setSceneError}
            />
          </Suspense>
          {sceneError && (
            <div className="scene-error">
              <AlertCircle />
              {sceneError}
            </div>
          )}
          {page === "workshop" && (
            <>
              <div className="view-label">
                <span className="live-dot" />
                {testing
                  ? "PROVING GROUND"
                  : exploded
                    ? "EXPLODED VIEW"
                    : "ASSEMBLY BAY 01"}
                <small>{preferences.quality.toUpperCase()} QUALITY</small>
              </div>
              <div className="camera-toolbar">
                <IconButton
                  label="Focus selected part"
                  onClick={() => actions.current?.focus()}
                >
                  <Crosshair size={18} />
                </IconButton>
                <IconButton
                  label="Reset camera"
                  onClick={() => actions.current?.resetCamera()}
                >
                  <RotateCcw size={18} />
                </IconButton>
                <IconButton
                  label="Zoom in"
                  onClick={() => actions.current?.zoom(-1)}
                >
                  <Plus size={18} />
                </IconButton>
                <IconButton
                  label="Zoom out"
                  onClick={() => actions.current?.zoom(1)}
                >
                  <Minus size={18} />
                </IconButton>
                <IconButton label="Fullscreen" onClick={fullscreen}>
                  <Maximize2 size={18} />
                </IconButton>
              </div>
              <div className="scene-caption">
                <span>FW–01</span>
                <small>
                  {testing
                    ? "CONTROLLED TEST AREA · KINEMATIC DEMO"
                    : `${demoVehicle.trim.toUpperCase()} · ORIGINAL DESIGN`}
                </small>
              </div>
            </>
          )}
        </div>
        {page === "home" ? (
          <>
            <section className="hero-copy">
              <div className="eyebrow">
                <span className="line" />
                THE ART OF PUTTING IT TOGETHER
              </div>
              <h1>
                Every part.
                <br />A purpose.
              </h1>
              <p>
                A car is more than the sum of its parts.
                <br />
                Discover what makes it yours.
              </p>
              <div className="hero-buttons">
                <button
                  className="primary large"
                  onClick={() => setModal("vehicles")}
                >
                  Enter the workshop <ArrowUpRight size={23} />
                </button>
                {saved && (
                  <button className="text-button" onClick={openProject}>
                    Resume project <ArrowRight size={16} />
                  </button>
                )}
              </div>
              <div className="hero-meta">
                <span>
                  <i />
                  PLAYABLE IN YOUR BROWSER
                </span>
                <span>NO ACCOUNT REQUIRED</span>
              </div>
              <div className="hero-bottom">
                <span>01 /</span>
                <p>
                  From bare chassis
                  <br />
                  to your first ignition.
                </p>
                <button
                  onClick={() => setModal("help")}
                  aria-label="Read the field guide"
                >
                  <ArrowRight size={24} />
                </button>
              </div>
            </section>
            <div className="showcase-badge">
              <span>THE ORIGINAL SERIES</span>
              <h2>
                FW–01 <span>COUPÉ</span>
              </h2>
              <p>
                2.0 L INLINE–FOUR <b>•</b> REAR-WHEEL DRIVE
              </p>
              <div>
                26 INTERACTIVE COMPONENTS <span>DESIGNED TO BE UNDERSTOOD</span>
              </div>
            </div>
            <div className="home-bottom">
              <div>
                <Box size={19} />
                <span>
                  BUILD WITH INTENTION<small>Every connection counts.</small>
                </span>
              </div>
              <div>
                <Wrench size={19} />
                <span>
                  LEARN BY DOING<small>Tools. Torque. Trial and error.</small>
                </span>
              </div>
              <div>
                <SaveIcon size={19} />
                <span>
                  MAKE IT YOURS<small>Your garage. Your project.</small>
                </span>
              </div>
              <button className="subtle" onClick={() => setModal("downloads")}>
                WEB · WINDOWS · ANDROID <ArrowUpRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <>
            {!testing && (
              <aside
                className={`parts-panel ${mobilePanel === "parts" ? "mobile-open" : ""}`}
              >
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">THE BUILD</span>
                    <h2>
                      Components <span>{parts.length}</span>
                    </h2>
                  </div>
                  <button
                    className="mobile-close icon-button"
                    onClick={() => setMobilePanel(null)}
                    aria-label="Close components"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="progress-block">
                  <div>
                    <span>Assembly progress</span>
                    <strong>
                      {completion}
                      <small>%</small>
                    </strong>
                  </div>
                  <div className="progress-track">
                    <i style={{ width: `${completion}%` }} />
                  </div>
                  <small>
                    {state.installed.length} of {parts.length} components
                    installed
                  </small>
                </div>
                <div className="parts-filter">
                  <label className="search">
                    <Search size={15} />
                    <input
                      placeholder="Find a component…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search components"
                    />
                  </label>
                  <select
                    aria-label="Component category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {[
                      "All parts",
                      "Structure",
                      "Chassis",
                      "Powertrain",
                      "Electrical",
                      "Interior",
                      "Body",
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="parts-list">
                  {visible.map((p) => {
                    const done = state.installed.includes(p.id),
                      blocked = prerequisites(state, p.id).length > 0;
                    return (
                      <button
                        className={`part-row ${selected === p.id ? "selected" : ""}`}
                        key={p.id}
                        onClick={() => {
                          setSelected(p.id);
                          if (window.innerWidth < 900)
                            setMobilePanel("assembly");
                        }}
                        aria-pressed={selected === p.id}
                      >
                        <span className={`part-index ${done ? "done" : ""}`}>
                          {done ? (
                            <Check size={15} />
                          ) : (
                            String(parts.indexOf(p) + 1).padStart(2, "0")
                          )}
                        </span>
                        <span>
                          <strong>{p.name}</strong>
                          <small>
                            {done
                              ? "INSTALLED"
                              : blocked
                                ? "AWAITING DEPENDENCIES"
                                : "READY TO ASSEMBLE"}
                          </small>
                        </span>
                        <ChevronRight size={14} />
                      </button>
                    );
                  })}
                  {!visible.length && (
                    <p className="empty-state">No matching components.</p>
                  )}
                </div>
                <button
                  className="collection-button"
                  onClick={() => setModal("collection")}
                >
                  <CarFront size={18} />
                  <span>My collection</span>
                  <ArrowUpRight size={16} />
                </button>
              </aside>
            )}
            {!testing && (
              <div className="workshop-top-controls">
                <select
                  aria-label="Assembly mode"
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value as Mode);
                    setMoveMode(false);
                  }}
                >
                  <option>Guided</option>
                  <option>Free assembly</option>
                  <option>Inspection</option>
                </select>
                <button
                  className={exploded ? "selected" : ""}
                  onClick={() => {
                    setExploded((x) => !x);
                    setMoveMode(false);
                  }}
                >
                  <Expand size={16} />
                  Exploded view
                </button>
                <IconButton
                  label="Undo"
                  onClick={() => setHistory((h) => undo(h))}
                  disabled={!history.past.length || mode === "Inspection"}
                >
                  <Undo2 size={17} />
                </IconButton>
                <IconButton
                  label="Redo"
                  onClick={() => setHistory((h) => redo(h))}
                  disabled={!history.future.length || mode === "Inspection"}
                >
                  <Redo2 size={17} />
                </IconButton>
              </div>
            )}
            {!testing && (
              <aside
                className={`assembly-panel ${mobilePanel === "assembly" ? "mobile-open" : ""}`}
              >
                <div className="panel-heading">
                  <span className="eyebrow">
                    {mode === "Inspection"
                      ? "INSPECT COMPONENT"
                      : "WORK ORDER / 001"}
                  </span>
                  <button
                    className="mobile-close icon-button"
                    onClick={() => setMobilePanel(null)}
                    aria-label="Close assembly"
                  >
                    <X size={18} />
                  </button>
                  <BookOpen size={17} />
                </div>
                {part && (
                  <>
                    <div className="part-detail">
                      <div className="part-category">
                        {part.category.toUpperCase()}{" "}
                        <span>{part.mass} KG</span>
                      </div>
                      <h2>{part.name}</h2>
                      <p>{part.description}</p>
                      <div
                        className={`part-state ${installed ? "complete" : ""}`}
                      >
                        {installed ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <span className="live-dot" />
                        )}
                        {installed
                          ? "Installed & secured"
                          : prerequisites(state, part.id).length
                            ? "Waiting for prerequisites"
                            : "Ready for installation"}
                      </div>
                    </div>
                    <div className="detail-section">
                      <h3>MOUNTING REQUIREMENTS</h3>
                      <div className="dependency-list">
                        {part.dependsOn.length ? (
                          part.dependsOn.map((id) => (
                            <button key={id} onClick={() => setSelected(id)}>
                              <span
                                className={
                                  state.installed.includes(id)
                                    ? "check-green"
                                    : "muted"
                                }
                              >
                                <CheckCircle2 size={14} />
                              </span>
                              {partById[id].name}
                              <ArrowUpRight size={12} />
                            </button>
                          ))
                        ) : (
                          <span className="muted">Project foundation</span>
                        )}
                      </div>
                    </div>
                    {mode !== "Inspection" && !installed && !exploded && (
                      <>
                        <div className="detail-section">
                          <h3>
                            01 <span>POSITION & ALIGN</span>
                          </h3>
                          <p className="hint">
                            Move the component to the green ghost. Snap within
                            13 cm and 6°.
                          </p>
                          <div className="button-pair">
                            <button
                              onClick={() => {
                                setMoveMode((v) => !v);
                                setMobilePanel(null);
                              }}
                              className={moveMode ? "selected" : ""}
                            >
                              <Move3D size={15} />
                              {moveMode ? "Drag enabled" : "Drag part"}
                            </button>
                            <button
                              onClick={() => {
                                apply(
                                  move(state, part.id, {
                                    position: [
                                      part.mount.position[0] + 0.06,
                                      part.mount.position[1],
                                      part.mount.position[2],
                                    ],
                                    rotation: 0,
                                  }),
                                );
                                actions.current?.resetCamera();
                              }}
                              title="Place the selected component near its mounting socket"
                            >
                              Guide to mount
                            </button>
                          </div>
                          <div className="nudge-controls">
                            <span>10 cm</span>
                            <button
                              aria-label="Move left"
                              onClick={() => nudge(0, -0.1)}
                            >
                              X−
                            </button>
                            <button
                              aria-label="Move right"
                              onClick={() => nudge(0, 0.1)}
                            >
                              X+
                            </button>
                            <button
                              aria-label="Lower part"
                              onClick={() => nudge(1, -0.1)}
                            >
                              Y−
                            </button>
                            <button
                              aria-label="Raise part"
                              onClick={() => nudge(1, 0.1)}
                            >
                              Y+
                            </button>
                            <button
                              aria-label="Move forward"
                              onClick={() => nudge(2, -0.1)}
                            >
                              Z−
                            </button>
                            <button
                              aria-label="Move back"
                              onClick={() => nudge(2, 0.1)}
                            >
                              Z+
                            </button>
                          </div>
                          <div className="button-pair">
                            <button
                              onClick={() => rotate(-15)}
                              aria-label="Rotate part left"
                            >
                              <RotateCcw size={15} />
                              −15°
                            </button>
                            <button
                              onClick={() => rotate(15)}
                              aria-label="Rotate part right"
                            >
                              <RotateCw size={15} />
                              +15°
                            </button>
                            <button
                              onClick={() =>
                                apply(
                                  snap(state, part.id),
                                  "Aligned to mount. Select the correct tool and fasten.",
                                )
                              }
                            >
                              <Crosshair size={14} />
                              Snap
                            </button>
                          </div>
                          <div className="transform-readout">
                            {placementFor(state, part.id).position.map(
                              (v, i) => (
                                <span key={i}>
                                  {"XYZ"[i]} {v.toFixed(2)}
                                </span>
                              ),
                            )}
                            <span>
                              {placementFor(state, part.id).rotation}°
                            </span>
                          </div>
                        </div>
                        <div className="detail-section">
                          <h3>
                            02 <span>SECURE THE CONNECTION</span>
                          </h3>
                          <div className="fastener-info">
                            <span>
                              {part.tool === "torque"
                                ? "Torque wrench"
                                : part.tool.charAt(0).toUpperCase() +
                                  part.tool.slice(1)}
                            </span>
                            <strong>
                              {part.torqueNm} <small>Nm</small>
                            </strong>
                          </div>
                          <div className="bolt-dots">
                            {Array.from({ length: part.fasteners }, (_, i) => (
                              <span
                                className={
                                  i < (state.fasteners[part.id] ?? 0)
                                    ? "tightened"
                                    : ""
                                }
                                key={i}
                              >
                                <Bolt size={14} />
                              </span>
                            ))}
                            <small>
                              {state.fasteners[part.id] ?? 0}/{part.fasteners}{" "}
                              secured
                            </small>
                          </div>
                          <button className="primary full" onClick={fastenPart}>
                            <Wrench size={16} />
                            {(state.fasteners[part.id] ?? 0) + 1 >=
                            part.fasteners
                              ? "Fasten & install"
                              : "Tighten next fastener"}
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </>
                    )}
                    {installed &&
                      mode !== "Inspection" &&
                      part.id !== "frame" && (
                        <div className="detail-section">
                          <button
                            className="danger full"
                            onClick={() =>
                              apply(
                                remove(state, part.id, tool),
                                `${part.name} detached.`,
                              )
                            }
                          >
                            Detach component <Wrench size={15} />
                          </button>
                          <p className="hint">
                            Use the required tool. Attached dependent parts must
                            be removed first.
                          </p>
                        </div>
                      )}
                    {exploded && (
                      <p className="inset-note">
                        Exploded view separates assemblies for inspection. Close
                        it to position parts.
                      </p>
                    )}
                    {mode === "Guided" && nextPart && (
                      <button
                        className="next-step"
                        onClick={() => setSelected(nextPart.id)}
                      >
                        <span>
                          NEXT RECOMMENDED<strong>{nextPart.name}</strong>
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    )}
                  </>
                )}
                <button
                  className="diagnostics-button"
                  onClick={() => setModal("diagnostics")}
                >
                  <Gauge size={18} />
                  Vehicle diagnostics <ArrowUpRight size={16} />
                </button>
              </aside>
            )}
            {testing ? (
              <div className="drive-hud">
                <div>
                  <span>TEST RUN</span>
                  <strong>
                    {speed}
                    <small>km/h</small>
                  </strong>
                  <p>
                    W / S accelerate & reverse · A / D steer
                    <br />
                    Release throttle to coast. Stay inside the 40 m test pad.
                  </p>
                </div>
                <div className="drive-buttons">
                  {[
                    { label: "Steer left", text: "←", key: "steer", value: -1 },
                    { label: "Throttle", text: "↑", key: "throttle", value: 1 },
                    {
                      label: "Reverse / brake",
                      text: "↓",
                      key: "throttle",
                      value: -1,
                    },
                    { label: "Steer right", text: "→", key: "steer", value: 1 },
                  ].map((b) => (
                    <button
                      key={b.label}
                      aria-label={b.label}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDrive((d) => ({ ...d, [b.key]: b.value }));
                      }}
                      onPointerUp={() =>
                        setDrive((d) => ({ ...d, [b.key]: 0 }))
                      }
                      onPointerCancel={() =>
                        setDrive((d) => ({ ...d, [b.key]: 0 }))
                      }
                    >
                      {b.text}
                    </button>
                  ))}
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    setTesting(false);
                    setDrive({ throttle: 0, steer: 0 });
                  }}
                >
                  Return to workshop <ArrowRight size={17} />
                </button>
              </div>
            ) : (
              <div className="tool-tray">
                <span className="tool-tray-label">YOUR TOOLS</span>
                {tools.map((t) => (
                  <button
                    key={t.id}
                    className={tool === t.id ? "active" : ""}
                    onClick={() => {
                      setTool(t.id);
                      if (t.id === "jack") setLift((x) => !x);
                    }}
                    title={
                      t.id === "jack" ? "Select jack and toggle lift" : t.name
                    }
                    aria-label={`Select ${t.name}`}
                    aria-pressed={tool === t.id}
                  >
                    {t.icon}
                    <span>{t.name}</span>
                  </button>
                ))}
                <span className="tray-divider" />
                <IconButton
                  label="Customize garage"
                  onClick={() => setModal("settings")}
                >
                  <Paintbrush size={20} />
                </IconButton>
              </div>
            )}
            <div className="mobile-tabs">
              <button
                onClick={() =>
                  setMobilePanel((m) => (m === "parts" ? null : "parts"))
                }
              >
                <Box size={16} />
                Parts
              </button>
              <button
                onClick={() =>
                  setMobilePanel((m) => (m === "assembly" ? null : "assembly"))
                }
              >
                <Wrench size={16} />
                Assembly
              </button>
              <button onClick={() => setModal("diagnostics")}>
                <Gauge size={16} />
                Status
              </button>
            </div>
          </>
        )}
      </main>
      {page === "workshop" && (
        <footer className="workshop-footer">
          <span>
            <MousePointer2 size={13} />
            Drag to orbit <i>·</i>Scroll / pinch to zoom <i>·</i>Right-drag /
            two fingers to pan
          </span>
          <div>
            <button
              onClick={() => setPreferences((p) => ({ ...p, sound: !p.sound }))}
              aria-label={preferences.sound ? "Mute sound" : "Enable sound"}
            >
              {preferences.sound ? (
                <Volume2 size={16} />
              ) : (
                <VolumeX size={16} />
              )}
            </button>
            <button onClick={() => setModal("help")}>
              <CircleHelp size={16} />
              Controls & guide
            </button>
            <span className="live-dot" />
            LOCAL PROJECT
          </div>
        </footer>
      )}
      {message && (
        <div role="status" className={`toast ${messageKind}`}>
          <span>
            {messageKind === "error" ? (
              <AlertCircle size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
          </span>
          {message}
          <button onClick={() => setMessage("")} aria-label="Dismiss message">
            <X size={15} />
          </button>
        </div>
      )}
      {updateReady && (
        <div className="update-banner">
          An update is ready. Save your project, then close and reopen all
          Formworks tabs.
          <button
            onClick={() => setUpdateReady(false)}
            aria-label="Dismiss update"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 1000000) throw new Error("Save file is too large.");
            const s = decodeSave(await file.text());
            if (
              saved &&
              !confirm(
                "Replace this device’s current project with the imported backup?",
              )
            )
              return;
            setHistory({ past: [], present: s.assembly, future: [] });
            setPreferences(s.preferences);
            actions.current?.restoreCamera(s.preferences.camera);
            setProfile(s.profile);
            setSaveEnabled(true);
            setSaved(true);
            writeSave(localStorage, s);
            notify("Backup restored.");
          } catch (error) {
            notify(`Import failed: ${(error as Error).message}`, "error");
          }
          e.target.value = "";
        }}
      />
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className={`modal ${modal === "vehicles" ? "vehicle-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={modal === "vehicles" ? "Choose your project" : modal}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setModal(null);
            }}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">FORMWORKS / FIELD NOTES</span>
                <h2>
                  {
                    {
                      vehicles: "Choose your project",
                      settings: "Make yourself at home",
                      help: "A little guidance. A lot to build.",
                      downloads: "The workshop, wherever you are.",
                      diagnostics: "Before the first ignition",
                      collection: "Your collection",
                    }[modal]
                  }
                </h2>
              </div>
              <IconButton label="Close dialog" onClick={() => setModal(null)}>
                <X size={21} />
              </IconButton>
            </div>
            {modal === "vehicles" && (
              <>
                <p className="modal-intro">
                  Start with a bare chassis. Learn every connection along the
                  way.
                </p>
                <div className="vehicle-card">
                  <div className="vehicle-card-art">
                    <CarFront size={70} strokeWidth={0.7} />
                    <span>FW / 01</span>
                    <small>ORIGINAL SERIES</small>
                  </div>
                  <div>
                    <span className="tag">PLAYABLE DEMO</span>
                    <h3>FW–01 Coupé</h3>
                    <p>2026 · Workshop Edition</p>
                    <div className="vehicle-specs">
                      <span>
                        26<small>COMPONENTS</small>
                      </span>
                      <span>
                        2.0 L<small>INLINE–FOUR</small>
                      </span>
                      <span>
                        RWD<small>DRIVETRAIN</small>
                      </span>
                    </div>
                    <button className="primary full" onClick={startNew}>
                      Start a new build <ArrowRight size={18} />
                    </button>
                    {saved && (
                      <button className="text-button" onClick={openProject}>
                        Resume saved project · {completion}%{" "}
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="planned">
                  <span className="eyebrow">THE ROAD AHEAD / COMING SOON</span>
                  <p>
                    {vehicleCategories
                      .filter((c) => c !== "Coupes")
                      .join(" · ")}
                  </p>
                  <small>
                    Future models require licensed assets. Only the original
                    FW-01 is playable.
                  </small>
                </div>
              </>
            )}
            {modal === "settings" && (
              <div className="settings-grid">
                <section>
                  <h3>
                    <Paintbrush size={17} />
                    YOUR GARAGE
                  </h3>
                  <p className="hint">
                    Home workshop · changes save with your project
                  </p>
                  <label>
                    Wall color
                    <input
                      type="color"
                      aria-label="Wall color"
                      value={preferences.garage.wall}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          garage: { ...p.garage, wall: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label>
                    Tool cabinet
                    <input
                      type="color"
                      aria-label="Tool cabinet color"
                      value={preferences.garage.cabinet}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          garage: { ...p.garage, cabinet: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label>
                    Floor finish
                    <select
                      aria-label="Floor finish"
                      value={preferences.garage.floor}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          garage: {
                            ...p.garage,
                            floor: e.target
                              .value as Preferences["garage"]["floor"],
                          },
                        }))
                      }
                    >
                      <option value="concrete">Brushed concrete</option>
                      <option value="tiles">Workshop tile</option>
                      <option value="epoxy">Satin epoxy</option>
                    </select>
                  </label>
                  <label>
                    Light intensity{" "}
                    <span>{preferences.garage.lighting.toFixed(1)}×</span>
                  </label>
                  <input
                    className="full"
                    type="range"
                    min="0.3"
                    max="2"
                    step="0.1"
                    aria-label="Light intensity"
                    value={preferences.garage.lighting}
                    onChange={(e) =>
                      setPreferences((p) => ({
                        ...p,
                        garage: {
                          ...p.garage,
                          lighting: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </section>
                <section>
                  <h3>
                    <SlidersHorizontal size={17} />
                    GRAPHICS & CONTROLS
                  </h3>
                  <label>
                    Graphics preset
                    <select
                      aria-label="Graphics preset"
                      value={preferences.quality}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          quality: e.target.value as Quality,
                        }))
                      }
                    >
                      {["Low", "Medium", "High", "Ultra"].map((q) => (
                        <option key={q}>{q}</option>
                      ))}
                    </select>
                  </label>
                  <p className="hint">
                    Low reduces render resolution and shadows. Ultra adds
                    ambient occlusion on WebGL 2. Initial Low mode uses simpler
                    wheel geometry.
                  </p>
                  <label>
                    Workshop audio
                    <input
                      aria-label="Workshop audio"
                      type="checkbox"
                      checked={preferences.sound}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          sound: e.target.checked,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Rotate part key
                    <input
                      className="key-input"
                      aria-label="Rotate part key"
                      value={preferences.rotateKey}
                      maxLength={1}
                      onChange={(e) => {
                        const key = e.target.value.toLowerCase();
                        if (/^[a-z]$/.test(key) && key !== "f")
                          setPreferences((p) => ({ ...p, rotateKey: key }));
                      }}
                    />
                  </label>
                  <button className="secondary full" onClick={fullscreen}>
                    <Maximize2 size={16} />
                    Toggle fullscreen
                  </button>
                </section>
                <section className="save-settings">
                  <h3>
                    <SaveIcon size={17} />
                    PROJECT BACKUPS
                  </h3>
                  <div className="button-pair">
                    <button onClick={exportSave}>
                      <Download size={16} />
                      Export save
                    </button>
                    <button onClick={() => importRef.current?.click()}>
                      <Upload size={16} />
                      Import save
                    </button>
                    <button onClick={() => saveNow()}>
                      <SaveIcon size={16} />
                      Save now
                    </button>
                  </div>
                  <p className="hint">
                    Saves stay on this device. Export a backup before clearing
                    browser data.
                  </p>
                </section>
              </div>
            )}
            {modal === "help" && (
              <div className="guide">
                <div className="guide-step">
                  <span>01</span>
                  <div>
                    <h3>Find the next connection.</h3>
                    <p>
                      Select a component in the left inventory. Guided mode
                      recommends the next available part. The green ghost shows
                      its mounting location.
                    </p>
                  </div>
                </div>
                <div className="guide-step">
                  <span>02</span>
                  <div>
                    <h3>Position. Align. Secure.</h3>
                    <p>
                      Choose Drag part to move it on a horizontal plane, or use
                      X/Y/Z controls for precise adjustments. Rotate in 15°
                      steps. Guide to mount brings it near the socket; Snap
                      checks alignment. Select the required tool and tighten
                      each fastener.
                    </p>
                  </div>
                </div>
                <div className="guide-step">
                  <span>03</span>
                  <div>
                    <h3>Understand what holds it together.</h3>
                    <p>
                      Parts need their supporting components installed first.
                      Remove dependent parts before detaching their mounts.
                      Inspection and exploded views help you see the whole
                      assembly.
                    </p>
                  </div>
                </div>
                <div className="controls-grid">
                  <span>
                    <b>Mouse / one finger</b>Orbit camera
                  </span>
                  <span>
                    <b>Wheel / pinch</b>Zoom
                  </span>
                  <span>
                    <b>Right-drag / two fingers</b>Pan camera
                  </span>
                  <span>
                    <b>Arrow keys</b>Move selected part 10 cm
                  </span>
                  <span>
                    <b>{preferences.rotateKey.toUpperCase()} / F</b>Rotate /
                    focus
                  </span>
                  <span>
                    <b>Ctrl/Cmd+Z / Shift+Z</b>Undo / redo
                  </span>
                  <span>
                    <b>Ctrl/Cmd+S</b>Save project
                  </span>
                  <span>
                    <b>WASD / touch arrows</b>Test area driving
                  </span>
                </div>
                <p className="inset-note">
                  This is a mechanical learning sandbox with dependency-based
                  assembly and a simple kinematic test area. It does not
                  simulate real repair procedures, structural loads, or tire
                  physics.
                </p>
              </div>
            )}
            {modal === "diagnostics" && (
              <>
                <p className="modal-intro">
                  Complete all systems before starting your FW-01.
                </p>
                <div className="diagnostic-list">
                  {diagnostics(state).map((d) => (
                    <div key={d.name}>
                      <span>
                        {d.ready ? (
                          <CheckCircle2 className="check-green" size={20} />
                        ) : (
                          <AlertCircle size={20} />
                        )}
                        <strong>{d.name}</strong>
                      </span>
                      <span>
                        {d.ready ? "Ready" : `${d.missing} components missing`}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="button-pair">
                  <button
                    className="primary"
                    disabled={!canStart(state)}
                    onClick={() => {
                      setEngineRunning((v) => !v);
                      if (!engineRunning) playSound("start", preferences.sound);
                      notify(
                        engineRunning
                          ? "Engine stopped."
                          : "Engine running. Systems ready for a test.",
                      );
                    }}
                  >
                    <Play size={17} />
                    {engineRunning ? "Stop engine" : "Start engine"}
                  </button>
                  <button
                    className="secondary"
                    disabled={!engineRunning}
                    onClick={() => {
                      setTesting(true);
                      setExploded(false);
                      setLift(false);
                      setPage("workshop");
                      setMobilePanel(null);
                      setModal(null);
                    }}
                  >
                    Enter test area <ArrowRight size={17} />
                  </button>
                </div>
                <p className="hint">
                  The first test area uses basic acceleration, steering and
                  braking, without a physics drivetrain.
                </p>
                {canStart(state) && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setProfile((p) => ({
                        ...p,
                        collection: [collectVehicle(state)],
                      }));
                      notify("Finished FW-01 added to your collection.");
                    }}
                  >
                    Save finished vehicle to collection{" "}
                    <ArrowUpRight size={16} />
                  </button>
                )}
              </>
            )}
            {modal === "collection" && (
              <>
                <p className="modal-intro">Finished projects, built by you.</p>
                {profile.collection.some(
                  (entry) => entry.vehicleId === "fw-01",
                ) ? (
                  <div className="collection-card">
                    <CarFront size={50} />
                    <div>
                      <h3>FW–01 · Workshop Edition</h3>
                      <p>First build completed</p>
                    </div>
                    <button
                      className="secondary"
                      onClick={() => {
                        if (
                          completion < 100 &&
                          !confirm(
                            "Open the finished collection build? This replaces your current project.",
                          )
                        )
                          return;
                        setHistory({
                          past: [],
                          present: copy(profile.collection[0].assembly),
                          future: [],
                        });
                        openProject();
                        setMode("Inspection");
                      }}
                    >
                      Open finished build
                    </button>
                  </div>
                ) : (
                  <div className="empty-state">
                    <CarFront size={54} />
                    <h3>Room for your first build.</h3>
                    <p>
                      Complete the FW-01, then add it from Vehicle diagnostics.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => {
                        openProject();
                      }}
                    >
                      Back to the build <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
            {modal === "downloads" && (
              <>
                <p className="modal-intro">
                  One workshop. A shared game across browser and native shells.
                </p>
                <div className="download-card">
                  <div>
                    <h3>Play in your browser</h3>
                    <p>Available now · v0.1.0 · local saves · no account</p>
                  </div>
                  <button
                    className="primary"
                    onClick={() => setModal("vehicles")}
                  >
                    Play now <Play size={17} />
                  </button>
                </div>
                {installPrompt && (
                  <button
                    className="secondary full"
                    onClick={async () => {
                      await installPrompt.prompt();
                      await installPrompt.userChoice;
                      setInstallPrompt(null);
                    }}
                  >
                    Install web app <Download size={17} />
                  </button>
                )}
                <div className="download-card">
                  <div>
                    <h3>Windows desktop</h3>
                    <p>
                      {downloadWindows
                        ? "Release artifact available"
                        : "Installer not published · packaging configuration included"}
                    </p>
                  </div>
                  {downloadWindows && /^https:\/\//.test(downloadWindows) && (
                    <a className="secondary" href={downloadWindows}>
                      Download Windows <Download size={17} />
                    </a>
                  )}
                </div>
                <div className="download-card">
                  <div>
                    <h3>Android</h3>
                    <p>
                      {downloadAndroid
                        ? "Release artifact available"
                        : "APK not published · Capacitor project included"}
                    </p>
                  </div>
                  {downloadAndroid && /^https:\/\//.test(downloadAndroid) && (
                    <a className="secondary" href={downloadAndroid}>
                      Download Android <Download size={17} />
                    </a>
                  )}
                </div>
                <div className="requirements">
                  <h3>SYSTEM REQUIREMENTS</h3>
                  <p>
                    Current Chrome, Edge, Firefox or Safari with WebGL.
                    Keyboard/mouse or touch. 4 GB RAM recommended; use Low
                    graphics on mobile. Desktop layouts work best at 1280 × 720
                    or above. Mobile landscape recommended.
                  </p>
                  <h3>WHAT’S IN 0.1.0</h3>
                  <p>
                    Original modular coupe, a customizable garage, validated
                    assembly, project backups and a basic test pad. Native
                    installers and high-detail licensed asset packs are upcoming
                    releases.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
