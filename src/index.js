import React from "react";
import ReactDOM from "react-dom/client";
import BarberShopBookingPWA from "./BarberShopBookingPWA";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BarberShopBookingPWA />
  </React.StrictMode>
);

// Service worker registration (ensure closing paren & semicolon are present)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js");
  });
}
