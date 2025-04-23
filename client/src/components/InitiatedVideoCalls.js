// InitiatedVideoCalls.js
import React, { useEffect, useRef } from "react";

const InitiatedVideoCalls = ({
  calls,
  localStream,
  webrtcSocket,
  myId,
  pendingCandidates,
}) => {
  return (
    <>
      {calls.map((call) => (
        <InitiatedCall
          key={call.id}
          call={call}
          localStream={localStream}
          socket={webrtcSocket}
          myId={myId}
          pendingCandidates={pendingCandidates}
        />
      ))}
    </>
  );
};

const InitiatedCall = ({
  call,
  localStream,
  socket,
  myId,
  pendingCandidates,
}) => {
  const localRef = useRef();
  const remoteRef = useRef();
  const pcRef = useRef();

  useEffect(() => {
    if (!localStream) return; // wait for camera/mic

    // 1) Create & wire peer connection once
    if (!pcRef.current) {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice-candidate", {
            senderId: myId,
            targetUserId: call.id,
            candidate: e.candidate,
          });
        }
      };

      pc.ontrack = (e) => {
        if (remoteRef.current && e.streams[0]) {
          remoteRef.current.srcObject = e.streams[0];
          remoteRef.current.play().catch(() => {});
        }
      };

      // add local tracks & show local preview
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      if (localRef.current) {
        localRef.current.srcObject = localStream;
        localRef.current.play().catch(() => {});
      }

      // === DRAIN ICE BUFFER FROM Map ===
      const buffered = pendingCandidates.get(call.id) || [];
      for (const c of buffered) {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
      }
      pendingCandidates.delete(call.id);
    }

    // 2) Send offer once
    if (!call.offerSent) {
      call.offerSent = true;
      pcRef.current
        .createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then((offer) => pcRef.current.setLocalDescription(offer))
        .then(() => {
          socket.emit("video-offer", {
            senderId: myId,
            targetUserId: call.id,
            offer: pcRef.current.localDescription,
          });
        })
        .catch(console.error);
    }

    // 3) Apply incoming answer once
    if (call.answer && !call.answerApplied) {
      call.answerApplied = true;
      pcRef.current
        .setRemoteDescription(new RTCSessionDescription(call.answer))
        .catch(console.error);
    }
  }, [call, localStream]);

  return (
    <div className="call-container">
      <p>To: {call.id}</p>
      <div className="video-grid">
        <div className="video-wrapper local">
          <video ref={localRef} autoPlay playsInline muted />
          <div className="video-label">You</div>
        </div>
        <div className="video-wrapper remote">
          <video ref={remoteRef} autoPlay playsInline />
          <div className="video-label">Remote</div>
        </div>
      </div>
    </div>
  );
};

export default InitiatedVideoCalls;
