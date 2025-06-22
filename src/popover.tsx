import React from "react";
import ReactDOM from "react-dom/client";

import CssBaseline from "@mui/material/CssBaseline";

import "./fonts/fonts.css";
import { GlobalStyles } from "./GlobalStyles";
import { PluginThemeProvider } from "./plugin/PluginThemeProvider";
import { PopoverTrays } from "./plugin/PopoverTrays";

export default function Popover() {
  return (
    <PluginThemeProvider>
      <PopoverTrays />
    </PluginThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PluginThemeProvider>
      <CssBaseline />
      <GlobalStyles />
      <Popover />
    </PluginThemeProvider>
  </React.StrictMode>
);
