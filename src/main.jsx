import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { ToastProvider } from "./context/ToastContext";
import { App } from "./App";

createRoot(document.getElementById("root")).render(<ToastProvider><App /></ToastProvider>);
