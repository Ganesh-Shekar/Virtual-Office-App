import React, { useState, useEffect } from "react";
import MyVideo from "./MyVideo";
import InitiatedVideoCalls from "./InitiatedVideoCalls";
import ReceivedVideoCalls from "./ReceivedVideoCalls";

const VideoCalls = ({ webrtcSocket }) => {
  const [localStream, setLocalStream] = useState(null);
  const [initiatedCalls, setInitiatedCalls] = useState([]);
  const [receivedCalls, setReceivedCalls] = useState([]);
  const [myId, setMyId] = useState(null);

  useEffect(() => {
    // Get local video stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        console.log("Local stream obtained successfully");
        setLocalStream(stream);
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
      });

    // WebSocket event listeners
    webrtcSocket.on("connect", () => {
      console.log("WebSocket connected successfully");
    });

    webrtcSocket.on("me", (id) => {
      console.log("Received my ID:", id);
      setMyId(id);
    });

    webrtcSocket.on("initiate-connection", (data) => {
      console.log("Received connection initiation request:", data);
      const { targetUserId } = data;
      initiateCall(targetUserId);
    });

    webrtcSocket.on("video-offer", (data) => {
      console.log(
        "Received video offer signal:",
        JSON.stringify(data, null, 2)
      );
      setReceivedCalls((prev) => [...prev, data]);
    });

    webrtcSocket.on("video-answer", (data) => {
      console.log("Received video answer:", data);
      // Handle video answer
      const call = initiatedCalls.find(
        (c) => c.targetUserId === data.targetUserId
      );
      if (call && call.peerConnection) {
        call.peerConnection
          .setRemoteDescription(new RTCSessionDescription(data.answer))
          .catch((err) =>
            console.error("Error setting remote description:", err)
          );
      }
    });

    webrtcSocket.on("ice-candidate", (data) => {
      console.log("Received ICE candidate:", data);
      // Handle ICE candidate
      const call = [...initiatedCalls, ...receivedCalls].find(
        (c) => c.targetUserId === data.targetUserId
      );
      if (call && call.peerConnection) {
        call.peerConnection
          .addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch((err) => console.error("Error adding ICE candidate:", err));
      }
    });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      // Clean up WebSocket listeners
      webrtcSocket.off("video-offer");
      webrtcSocket.off("video-answer");
      webrtcSocket.off("ice-candidate");
      webrtcSocket.off("initiate-connection");
    };
  }, [webrtcSocket, initiatedCalls]);

  const initiateCall = (targetUserId) => {
    console.log("Initiating call to user:", targetUserId);
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    const newCall = {
      targetUserId,
      status: "initiating",
      peerConnection,
    };

    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    setInitiatedCalls((prev) => [...prev, newCall]);
  };

  return (
    <div className="video-calls-container">
      <MyVideo localStream={localStream} />
      <InitiatedVideoCalls
        calls={initiatedCalls}
        localStream={localStream}
        webrtcSocket={webrtcSocket}
      />
      <ReceivedVideoCalls
        calls={receivedCalls}
        localStream={localStream}
        webrtcSocket={webrtcSocket}
      />
    </div>
  );
};

export default VideoCalls;
