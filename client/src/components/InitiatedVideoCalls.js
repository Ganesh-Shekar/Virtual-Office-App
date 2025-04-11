import React, { useEffect } from "react";

const InitiatedVideoCalls = ({ calls, localStream, webrtcSocket }) => {
  useEffect(() => {
    const handleIceCandidate = (event, targetUserId) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to:", targetUserId, event.candidate);
        webrtcSocket.emit("ice-candidate", {
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    calls.forEach((call) => {
      if (call.status === "initiating") {
        const peerConnection = call.peerConnection;

        // Add local stream to peer connection
        if (localStream) {
          localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
          });
        }

        // Create and send offer
        peerConnection
          .createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          .then((offer) => {
            console.log("Created offer:", offer);
            return peerConnection.setLocalDescription(offer);
          })
          .then(() => {
            console.log("Sending offer to:", call.targetUserId);
            webrtcSocket.emit("video-offer", {
              targetUserId: call.targetUserId,
              offer: peerConnection.localDescription,
            });
          })
          .catch((err) => console.error("Error creating/sending offer:", err));

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) =>
          handleIceCandidate(event, call.targetUserId);

        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          console.log(
            "ICE connection state changed:",
            peerConnection.iceConnectionState
          );
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log(
            "Connection state changed:",
            peerConnection.connectionState
          );
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          console.log("Received remote track:", event.track.kind);
          const videoElement = document.getElementById(
            `remote-video-${call.targetUserId}`
          );
          if (videoElement) {
            videoElement.srcObject = event.streams[0];
          }
        };
      }
    });
  }, [calls, localStream, webrtcSocket]);

  return (
    <div className="initiated-calls">
      {calls.map((call) => (
        <div key={call.targetUserId} className="call-container">
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
      ))}
    </div>
  );
};

export default InitiatedVideoCalls;
