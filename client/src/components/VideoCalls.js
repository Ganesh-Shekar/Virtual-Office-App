import React, { useState, useEffect, useRef } from "react";
import MyVideo from "./MyVideo";
import InitiatedVideoCalls from "./InitiatedVideoCalls";
import ReceivedVideoCalls from "./ReceivedVideoCalls";

const VideoCalls = ({ webrtcSocket }) => {
  const [localStream, setLocalStream] = useState(null);
  const [initiatedCalls, setInitiatedCalls] = useState([]);
  const [receivedCalls, setReceivedCalls] = useState([]);
  const [myId, setMyId] = useState(null);

  // Buffer ICE candidates until peerConnection is ready
  const pending = useRef(new Map());

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => setLocalStream(s))
      .catch(console.error);

    if (!webrtcSocket) return;
    webrtcSocket.on("me", setMyId);

    webrtcSocket.on("initiate-connection", ({ targetUserId }) => {
      if (targetUserId === myId) return; // don't self‑call
      if (!initiatedCalls.some((c) => c.id === targetUserId)) {
        setInitiatedCalls((prev) => [...prev, { id: targetUserId }]);
      }
    });

    webrtcSocket.on("video-offer", (data) => {
      const { senderId, offer } = data;
      if (senderId === myId) return;
      setReceivedCalls((prev) =>
        prev.some((c) => c.id === senderId)
          ? prev
          : [...prev, { id: senderId, offer }]
      );
    });

    webrtcSocket.on("video-answer", ({ senderId, answer }) => {
      setInitiatedCalls((prev) =>
        prev.map((c) => (c.id === senderId ? { ...c, answer } : c))
      );
    });

    webrtcSocket.on("ice-candidate", ({ senderId, candidate }) => {
      // stash for either side until their peerConnection exists
      const arr = pending.current.get(senderId) || [];
      arr.push(candidate);
      pending.current.set(senderId, arr);
    });

    webrtcSocket.on("user-disconnected", (disconnectedUserId) => {
      // Remove the disconnected user from both initiated and received calls
      setInitiatedCalls((prev) =>
        prev.filter((call) => call.id !== disconnectedUserId)
      );
      setReceivedCalls((prev) =>
        prev.filter((call) => call.id !== disconnectedUserId)
      );
      // Clear any pending ICE candidates for the disconnected user
      pending.current.delete(disconnectedUserId);
    });

    return () => {
      webrtcSocket.off("me");
      webrtcSocket.off("initiate-connection");
      webrtcSocket.off("video-offer");
      webrtcSocket.off("video-answer");
      webrtcSocket.off("ice-candidate");
      webrtcSocket.off("user-disconnected");
    };
  }, [webrtcSocket, myId, initiatedCalls]);

  return (
    <div className="video-calls-container">
      {!initiatedCalls.length && !receivedCalls.length ? (
        <div className="my-video-container">
          <video
            autoPlay
            playsInline
            muted
            ref={(videoRef) => {
              if (videoRef && localStream) {
                videoRef.srcObject = localStream;
              }
            }}
          />
          <div className="video-label">You</div>
        </div>
      ) : (
        <div className="video-grid">
          <InitiatedVideoCalls
            calls={initiatedCalls}
            localStream={localStream}
            webrtcSocket={webrtcSocket}
            myId={myId}
            pendingCandidates={pending.current}
          />
          <ReceivedVideoCalls
            calls={receivedCalls}
            localStream={localStream}
            webrtcSocket={webrtcSocket}
            myId={myId}
            pendingCandidates={pending.current}
          />
        </div>
      )}
    </div>
  );
};

export default VideoCalls;
