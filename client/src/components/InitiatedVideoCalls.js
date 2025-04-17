import React, { useEffect } from "react";

const InitiatedVideoCalls = ({ calls, localStream, webrtcSocket }) => {
  useEffect(() => {
    // Nothing to do here anymore as the peer connection setup is handled in VideoCalls.js
  }, [calls, localStream, webrtcSocket]);

  return (
    <div className="initiated-calls">
      <h3>Outgoing Calls</h3>
      {calls.length === 0 ? (
        <p>No outgoing calls</p>
      ) : (
        calls.map((call) => (
          <div key={call.targetUserId} className="call-container">
            <div className="call-info">
              <p>Call with: {call.targetUserId}</p>
              <p>Status: {call.status}</p>
            </div>
            <video
              id={`remote-video-${call.targetUserId}`}
              autoPlay
              playsInline
              style={{
                width: "200px",
                height: "150px",
                border: "2px solid #ccc",
                borderRadius: "8px",
              }}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default InitiatedVideoCalls;
