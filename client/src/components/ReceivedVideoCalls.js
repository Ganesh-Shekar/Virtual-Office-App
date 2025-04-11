import React, { useEffect } from "react";

const ReceivedVideoCalls = ({ calls, localStream, webrtcSocket }) => {
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
      if (!call.peerConnection) {
        console.log(
          "Creating peer connection for incoming call from:",
          call.targetUserId
        );
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        call.peerConnection = peerConnection;

        // Add local stream to peer connection
        if (localStream) {
          localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
          });
        }

        // Set remote description
        console.log("Setting remote description from offer:", call.offer);
        peerConnection
          .setRemoteDescription(new RTCSessionDescription(call.offer))
          .then(() => {
            console.log("Creating answer for incoming call");
            return peerConnection.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
          })
          .then((answer) => {
            console.log("Created answer:", answer);
            return peerConnection.setLocalDescription(answer);
          })
          .then(() => {
            console.log("Sending answer to:", call.targetUserId);
            webrtcSocket.emit("video-answer", {
              targetUserId: call.targetUserId,
              answer: peerConnection.localDescription,
            });
          })
          .catch((err) => console.error("Error handling offer:", err));

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
            `received-video-${call.targetUserId}`
          );
          if (videoElement) {
            videoElement.srcObject = event.streams[0];
          }
        };
      }
    });
  }, [calls, localStream, webrtcSocket]);

  return (
    <div className="received-calls">
      {calls.map((call) => (
        <div key={call.targetUserId} className="call-container">
          <video
            id={`received-video-${call.targetUserId}`}
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

export default ReceivedVideoCalls;
