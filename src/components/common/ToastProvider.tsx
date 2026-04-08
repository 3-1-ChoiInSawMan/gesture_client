"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ToastProvider() {
  return (
    <ToastContainer
      position="top-center"
      autoClose={3000}
      hideProgressBar
      closeOnClick
      pauseOnHover
      draggable={false}
      toastStyle={{
        borderRadius: "12px",
        fontSize: "14px",
        fontWeight: "500",
        padding: "12px 20px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      }}
    />
  );
}