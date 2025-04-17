import React, { useState, useEffect } from "react";
import MyVideo from "./MyVideo";
import InitiatedVideoCalls from "./InitiatedVideoCalls";
import ReceivedVideoCalls from "./ReceivedVideoCalls";

const VideoCalls = ({ webrtcSocket }) => {
  const [localStream, setLocalStream] = useState(null);
  const [initiatedCalls, setInitiatedCalls] = useState([]);
  const [receivedCalls, setReceivedCalls] = useState([]);
  const [myId, setMyId] = useState(null);

  // Only get media stream once on component mount
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

    // Cleanup function to stop all tracks when component unmounts
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // Empty dependency array = only run once on mount

  // Handle WebSocket events
  useEffect(() => {
    if (!webrtcSocket) return;

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
      // Check if already initiated a call with this user
      const existingCall = initiatedCalls.find(
        (c) => c.targetUserId === targetUserId
      );
      if (!existingCall) {
        initiateCall(targetUserId);
      } else {
        console.log("Call already initiated with user:", targetUserId);
      }
    });

    webrtcSocket.on("video-offer", (data) => {
      console.log(
        "Received video offer signal:",
        JSON.stringify(data, null, 2)
      );
      // Check if already received an offer from this user
      const existingCall = receivedCalls.find(
        (c) => c.targetUserId === data.senderId
      );
      if (!existingCall) {
        setReceivedCalls((prev) => [
          ...prev,
          {
            ...data,
            targetUserId: data.senderId,
          },
        ]);
      } else {
        console.log("Offer already received from user:", data.senderId);
      }
    });

    // Clean up WebSocket listeners when component unmounts or webrtcSocket changes
    return () => {
      webrtcSocket.off("connect");
      webrtcSocket.off("me");
      webrtcSocket.off("initiate-connection");
      webrtcSocket.off("video-offer");
    };
  }, [webrtcSocket, initiatedCalls]); // Only depend on webrtcSocket and initiatedCalls

  // Handle video answers
  useEffect(() => {
    if (!webrtcSocket) return;

    const handleVideoAnswer = (data) => {
      console.log("Received video answer:", data);
      // Find the initiated call
      const callIndex = initiatedCalls.findIndex(
        (c) => c.targetUserId === data.senderId
      );

      if (callIndex !== -1 && initiatedCalls[callIndex].peerConnection) {
        try {
          initiatedCalls[callIndex].peerConnection
            .setRemoteDescription(new RTCSessionDescription(data.answer))
            .then(() => {
              console.log("Remote description set successfully");
              // Update call status
              const updatedCalls = [...initiatedCalls];
              updatedCalls[callIndex].status = "connected";
              setInitiatedCalls(updatedCalls);
            })
            .catch((err) => {
              console.error("Error setting remote description:", err);
            });
        } catch (error) {
          console.error("Error handling video answer:", error);
        }
      } else {
        console.warn("Could not find call for answer from:", data.senderId);
      }
    };

    webrtcSocket.on("video-answer", handleVideoAnswer);

    return () => {
      webrtcSocket.off("video-answer");
    };
  }, [webrtcSocket, initiatedCalls]);

  // Handle ICE candidates
  useEffect(() => {
    if (!webrtcSocket) return;

    const handleIceCandidate = (data) => {
      console.log("Received ICE candidate:", data);
      // Find the call in both initiated and received calls
      const initiatedCall = initiatedCalls.find(
        (c) => c.targetUserId === data.senderId
      );

      const receivedCall = receivedCalls.find(
        (c) => c.targetUserId === data.senderId
      );

      const call = initiatedCall || receivedCall;

      if (call && call.peerConnection) {
        try {
          call.peerConnection
            .addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch((err) => console.error("Error adding ICE candidate:", err));
        } catch (error) {
          console.error("Error handling ICE candidate:", error);
        }
      } else {
        console.warn(
          "Could not find call for ICE candidate from:",
          data.senderId
        );
      }
    };

    webrtcSocket.on("ice-candidate", handleIceCandidate);

    return () => {
      webrtcSocket.off("ice-candidate");
    };
  }, [webrtcSocket, initiatedCalls, receivedCalls]);

  const initiateCall = (targetUserId) => {
    console.log("Initiating call to user:", targetUserId);

    // Create a new peer connection with proper configuration
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      iceCandidatePoolSize: 10,
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Generated ICE candidate for:", targetUserId);
        webrtcSocket.emit("ice-candidate", {
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log("Connection state changed:", peerConnection.connectionState);
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "ICE connection state changed:",
        peerConnection.iceConnectionState
      );
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      const videoElement = document.getElementById(
        `remote-video-${targetUserId}`
      );
      if (videoElement) {
        videoElement.srcObject = event.streams[0];
      }
    };

    // Create the new call object
    const newCall = {
      targetUserId,
      status: "initiating",
      peerConnection,
    };

    // Add to initiated calls (will trigger the useEffect in InitiatedVideoCalls)
    setInitiatedCalls((prev) => [...prev, newCall]);

    // Add local stream tracks to the peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log("Adding track to peer connection:", track.kind);
        peerConnection.addTrack(track, localStream);
      });
    }

    // Create and send the offer directly here instead of in InitiatedVideoCalls
    peerConnection
      .createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
      .then((offer) => {
        console.log("Created offer");
        return peerConnection.setLocalDescription(offer);
      })
      .then(() => {
        console.log("Set local description, sending offer to:", targetUserId);
        webrtcSocket.emit("video-offer", {
          targetUserId,
          offer: peerConnection.localDescription,
        });
      })
      .catch((err) => {
        console.error("Error creating/sending offer:", err);
        // Remove the call from initiated calls on error
        setInitiatedCalls((prev) =>
          prev.filter((call) => call.targetUserId !== targetUserId)
        );
      });
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
