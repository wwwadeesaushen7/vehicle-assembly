import { createRoot } from "react-dom/client";
import App from "./ui/App";
import "./ui/styles.css";
createRoot(document.getElementById("root")!).render(<App />);
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw.js`,
      );
      if (registration.waiting)
        window.dispatchEvent(new Event("formworks-update"));
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          )
            window.dispatchEvent(new Event("formworks-update"));
        });
      });
    } catch (error) {
      console.warn("Offline cache unavailable:", error);
    }
  });
}
