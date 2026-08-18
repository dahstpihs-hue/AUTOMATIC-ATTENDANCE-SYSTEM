import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import DeveloperToolbar from "./components/DeveloperToolbar";

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <DeveloperToolbar />
    </BrowserRouter>
  );
}
