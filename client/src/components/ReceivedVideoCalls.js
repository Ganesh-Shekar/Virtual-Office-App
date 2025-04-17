import React, { useEffect } from "react";

const ReceivedVideoCalls = ({ calls, localStream, webrtcSocket }) => {
  useEffect(() => {
    calls.forEach((call) => {
      // Only process new calls that don't have a peer connection yet
      if (!call.peerConnection) {
        console.log("Processing new incoming call from:", call.targetUserId);

        // Create a new peer connection for this call
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          iceCandidatePoolSize: 10,
        });

        // Store the peer connection with the call
        call.peerConnection = peerConnection;
        call.answerCreated = false;

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Generated ICE candidate for:", call.targetUserId);
            webrtcSocket.emit("ice-candidate", {
              targetUserId: call.targetUserId,
              candidate: event.candidate,
            });
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log(
            "Connection state changed:",
            peerConnection.connectionState
          );
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
            `received-video-${call.targetUserId}`
          );
          if (videoElement) {
            videoElement.srcObject = event.streams[0];
          }
        };

        // Add local stream to peer connection
        if (localStream) {
          localStream.getTracks().forEach((track) => {
            console.log("Adding track to peer connection:", track.kind);
            peerConnection.addTrack(track, localStream);
          });
        }

        // Process the offer and create answer
        const processOffer = async () => {
          try {
            console.log("Setting remote description from offer");
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(call.offer)
            );

            console.log("Creating answer");
            const answer = await peerConnection.createAnswer();

            console.log("Setting local description");
            await peerConnection.setLocalDescription(answer);

            console.log("Sending answer to:", call.targetUserId);
            webrtcSocket.emit("video-answer", {
              targetUserId: call.targetUserId,
              answer: peerConnection.localDescription,
            });

            call.answerCreated = true;
          } catch (error) {
            console.error("Error processing offer:", error);
          }
        };

        // Start processing the offer
        processOffer();
      }
    });
  }, [calls, localStream, webrtcSocket]);

  return (
    <div className="received-calls">
      <h3>Incoming Calls</h3>
      {calls.length === 0 ? (
        <p>No incoming calls</p>
      ) : (
        calls.map((call) => (
          <div key={call.targetUserId} className="call-container">
            <div className="call-info">
              <p>Call from: {call.targetUserId}</p>
              <p>Status: {call.answerCreated ? "Answered" : "Processing"}</p>
            </div>
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
        ))
      )}
    </div>
  );
};

export default ReceivedVideoCalls;
