import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/montserrat";
import "@fontsource/anton";
import App from "./App.jsx";
import "./styles.css";
import "./site/tokens.css";
import "./site/site.css";
import "./site/pages.css";
import "./site/sales.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
