// ReceivedVideoCalls.js
import React, { useEffect, useRef } from "react";

const ReceivedVideoCalls = ({
  calls,
  localStream,
  webrtcSocket,
  myId,
  pendingCandidates, // this is a Map<peerId, RTCIceCandidateInit[]>
}) => {
  return (
    <>
      {calls.map((call) => (
        <ReceivedCall
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

const ReceivedCall = ({
  call,
  localStream,
  socket,
  myId,
  pendingCandidates,
}) => {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const pcRef = useRef(null);

  useEffect(() => {
    // 1) don't proceed until we have camera/mic
    if (!localStream) return;

    // 2) create RTCPeerConnection once
    if (!pcRef.current) {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      // forward our ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice-candidate", {
            senderId: myId,
            targetUserId: call.id,
            candidate: e.candidate,
          });
        }
      };

      // when remote track arrives, attach it
      pc.ontrack = (e) => {
        if (remoteRef.current && e.streams[0]) {
          remoteRef.current.srcObject = e.streams[0];
          remoteRef.current.play().catch(() => {});
        }
      };

      // show our local preview
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      if (localRef.current) {
        localRef.current.srcObject = localStream;
        localRef.current.play().catch(() => {});
      }

      // 3) now process the incoming offer
      (async () => {
        try {
          // a) set remote description first
          await pc.setRemoteDescription(new RTCSessionDescription(call.offer));

          // b) only now drain any buffered ICE candidates
          const buffered = pendingCandidates.get(call.id) || [];
          for (const c of buffered) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidates.delete(call.id);

          // c) create & send our answer
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(answer);

          socket.emit("video-answer", {
            senderId: myId,
            targetUserId: call.id,
            answer: pc.localDescription,
          });
        } catch (err) {
          console.error("Error handling incoming offer:", err);
        }
      })();
    }
  }, [call, localStream]);

  return (
    <div className="call-container">
      <p>From: {call.id}</p>
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

export default ReceivedVideoCalls;
