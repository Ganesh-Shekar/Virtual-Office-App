import React, { useCallback, useRef, useEffect, useState } from "react";
import Peer from "simple-peer";
import {
  getIceServers,
  attachRTCPeerConnectionListeners,
} from "../utils/webrtcHelpers";

function InitiatedVideoCalls({
  otherSocketId,
  mySocketId,
  myStream,
  webrtcSocket,
  onStatusChange = () => {},
}) {
  const peerRef = useRef(null);
  const [connectionState, setConnectionState] = useState("initializing");
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const updateStatus = (status) => {
    console.log(`InitiatedVideoCall to ${otherSocketId}: ${status}`);
    setConnectionState(status);
    onStatusChange(status);
  };

  // Automatically attempt connection when component mounts
  useEffect(() => {
    if (webrtcSocket && mySocketId && otherSocketId && myStream) {
      console.log(
        `Automatically initiating call to ${otherSocketId} from ${mySocketId}`
      );
      updateStatus("auto-initiating");
      // The peer will be created in the createPeer function
    } else {
      console.log(
        `Not initiating call yet. Missing: ${
          !webrtcSocket ? "webrtcSocket " : ""
        }${!mySocketId ? "mySocketId " : ""}${
          !otherSocketId ? "otherSocketId " : ""
        }${!myStream ? "myStream " : ""}`
      );
    }
  }, [webrtcSocket, mySocketId, otherSocketId, myStream]);

  const createPeer = useCallback(() => {
    if (!webrtcSocket) {
      console.error("webrtcSocket is undefined!");
      updateStatus("socket error");
      return null;
    }
    if (!otherSocketId) {
      console.error("otherSocketId is undefined!");
      updateStatus("no remote id");
      return null;
    }
    if (!myStream) {
      console.error("myStream is undefined!");
      updateStatus("no media");
      return null;
    }
    if (!mySocketId) {
      console.error("mySocketId is undefined!");
      updateStatus("no local id");
      return null;
    }

    console.log(
      `Creating initiator Peer for remote user: ${otherSocketId} from ${mySocketId}`
    );
    updateStatus("creating peer");
    setConnectionAttempts((prev) => prev + 1);

    try {
      const peer = new Peer({
        initiator: true,
        trickle: true, // Changed to true to allow ICE candidates to flow
        stream: myStream,
        config: getIceServers(),
      });

      // When the peer generates signaling data (SDP/ICE candidates),
      // emit a "senderOffer" event to the server.
      peer.on("signal", (signalData) => {
        console.log(
          `Initiator: Generated signal data for ${otherSocketId}:`,
          signalData
        );
        updateStatus(`signaling (${signalData.type || "candidate"})`);

        if (webrtcSocket && webrtcSocket.connected) {
          console.log(
            `Emitting senderOffer to ${otherSocketId} from ${mySocketId}`
          );

          // Add a timestamp to help with debugging
          const offerData = {
            callToUserSocketId: otherSocketId,
            callFromUserSocketId: mySocketId,
            signal: signalData,
            timestamp: new Date().toISOString(),
          };

          webrtcSocket.emit("senderOffer", offerData);

          // Log the full data being sent
          console.log("Full offer data:", offerData);
        } else {
          console.error(
            `Socket disconnected or undefined. Cannot send offer to ${otherSocketId}`
          );
          updateStatus("socket disconnected");
        }
      });

      peer.on("error", (err) => {
        console.error(`Peer error (initiator side) for ${otherSocketId}:`, err);
        updateStatus(`peer error: ${err.message}`);
      });

      peer.on("connect", () => {
        console.log(`Initiator Peer connected to ${otherSocketId}!`);
        updateStatus("connected");
      });

      peer.on("close", () => {
        console.log(`Initiator Peer connection to ${otherSocketId} closed`);
        updateStatus("closed");
      });

      peer.on("stream", (stream) => {
        console.log(`Received remote stream from ${otherSocketId}:`, stream);
        setRemoteStream(stream);
        updateStatus("streaming");
      });

      // Add detailed connection state logging
      attachRTCPeerConnectionListeners(peer, otherSocketId);

      return peer;
    } catch (error) {
      console.error(`Error creating peer for ${otherSocketId}:`, error);
      updateStatus(`peer creation error: ${error.message}`);
      return null;
    }
  }, [otherSocketId, mySocketId, myStream, webrtcSocket, onStatusChange]);

  useEffect(() => {
    // Only create the peer if all dependencies are available
    if (
      !peerRef.current &&
      myStream &&
      webrtcSocket &&
      mySocketId &&
      otherSocketId
    ) {
      peerRef.current = createPeer();
    }

    // Set up listener for answers
    const handleReceiveAnswer = (data) => {
      if (data.from === otherSocketId && peerRef.current) {
        console.log(`Received answer from ${otherSocketId}:`, data);
        updateStatus("received answer");
        try {
          peerRef.current.signal(data.signal);
        } catch (error) {
          console.error(
            `Error applying answer signal from ${otherSocketId}:`,
            error
          );
          updateStatus(`signal error: ${error.message}`);
        }
      }
    };

    // Set up listener for ICE candidates
    const handleCandidate = (data) => {
      if (data.from === otherSocketId && peerRef.current) {
        console.log(
          `Received ICE candidate from ${otherSocketId}:`,
          data.candidate
        );
        try {
          peerRef.current.signal({ candidate: data.candidate });
        } catch (error) {
          console.error(
            `Error applying ICE candidate from ${otherSocketId}:`,
            error
          );
        }
      }
    };

    // Handle peer errors reported by the server
    const handlePeerError = (error) => {
      if (error.targetId === otherSocketId) {
        console.error(
          `Server reported peer error for ${otherSocketId}:`,
          error
        );
        updateStatus(`server error: ${error.type}`);

        // If the recipient is not connected, destroy the peer
        if (error.type === "recipient-not-connected" && peerRef.current) {
          console.log(
            `Destroying peer for ${otherSocketId} due to recipient not connected`
          );
          peerRef.current.destroy();
          peerRef.current = null;
        }
      }
    };

    if (webrtcSocket) {
      webrtcSocket.on("receiveAnswer", handleReceiveAnswer);
      webrtcSocket.on("candidate", handleCandidate);
      webrtcSocket.on("peerError", handlePeerError);
    }

    // Cleanup on unmount or if dependencies change
    return () => {
      if (peerRef.current) {
        console.log(`Destroying peer for ${otherSocketId}`);
        peerRef.current.destroy();
        peerRef.current = null;
      }

      if (webrtcSocket) {
        webrtcSocket.off("receiveAnswer", handleReceiveAnswer);
        webrtcSocket.off("candidate", handleCandidate);
        webrtcSocket.off("peerError", handlePeerError);
      }
    };
  }, [createPeer, myStream, webrtcSocket, otherSocketId, mySocketId]);

  // Function to manually retry the connection
  const retryConnection = () => {
    console.log(`Manually retrying connection to ${otherSocketId}`);

    // Destroy existing peer if any
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Create a new peer
    peerRef.current = createPeer();
    updateStatus("retrying");
  };

  // Return a component showing connection state and remote video if available
  return (
    <div
      className="initiated-call"
      style={{ margin: "5px", padding: "5px", border: "1px solid #ccc" }}
    >
      <p>Call to: {otherSocketId}</p>
      <p>Status: {connectionState}</p>
      <p>Attempts: {connectionAttempts}</p>

      {/* Retry button */}
      <button onClick={retryConnection}>Retry Connection</button>

      {/* If we have a remote stream, display it */}
      {remoteStream && (
        <div className="remote-video-container">
          <video
            autoPlay
            playsInline
            ref={(video) => {
              if (video && remoteStream) video.srcObject = remoteStream;
            }}
            style={{ width: "200px", height: "150px" }}
          />
        </div>
      )}
    </div>
  );
}

export default InitiatedVideoCalls;
