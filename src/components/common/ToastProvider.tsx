"use client";

import { ToastContainer } from "react-toastify";

export default function ToastProvider() {
  return (
    <ToastContainer
      position="top-center"
      autoClose={3000}
      hideProgressBar
      closeOnClick
      pauseOnHover
      draggable={false}
      style={{ zIndex: 99999 }}
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