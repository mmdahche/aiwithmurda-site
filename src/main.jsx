import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/montserrat";
import "@fontsource/anton";
import App from "./App.jsx";
import "./styles.css";
import "./storefront.css";
import "./site/tokens.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
