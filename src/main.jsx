import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/montserrat";
import "@fontsource/anton";
import App from "./App.jsx";
import "./styles.css";
import "./site/tokens.css";
import "./site/carryover.css";
import "./site/site.css";
import "./site/catalog.css";
import "./site/product.css";
import "./site/free.css";
import "./site/members.css";
import "./site/pages.css";
import "./site/legacy.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
