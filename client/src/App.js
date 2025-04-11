import React, { useState } from "react";
import { io } from "socket.io-client";
import GameLoop from "./components/GameLoop";
import Office from "./components/Office";
import VideoCalls from "./components/VideoCalls";
import "./App.css";

const WEBRTC_SOCKET = io("http://localhost:8080");

function App() {
  const [socketConnected, setSocketConnected] = useState(false);

  WEBRTC_SOCKET.on("connect", () => {
    setSocketConnected(true);
    console.log("Socket connected:", WEBRTC_SOCKET.id);
  });

  return (
    <div className="App">
      <header />
      {socketConnected && (
        <main className="content">
          {/* The map area (GameLoop/Office) is centered but the container spans full width */}
          <GameLoop>
            <Office webrtcSocket={WEBRTC_SOCKET} />
          </GameLoop>
          {/* The video section appears below the map */}
          <VideoCalls webrtcSocket={WEBRTC_SOCKET} />
        </main>
      )}
      <footer />
    </div>
  );
}

export default App;
