import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Game from "./components/Game"
import FacialDetection from "./components/FacialDetection/FacialDetection"
import AudioRecording from "./components/AudioRecording/AudioRecording"

const router = createBrowserRouter([
  {
    path: "/",
    element: <FacialDetection />,
  },
  {
    path: "game",
    element: <Game />,
  },
  {
    path: "audio",
    element: <AudioRecording />,
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <RouterProvider router={router} />
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
