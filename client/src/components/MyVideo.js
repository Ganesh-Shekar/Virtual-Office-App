import React, { useEffect, useRef, useState } from "react";

function MyVideo({ myStream }) {
  const videoRef = useRef(null);
  const [streamInfo, setStreamInfo] = useState({ video: false, audio: false });

  useEffect(() => {
    if (myStream && videoRef.current) {
      console.log("Setting video source object in MyVideo component");
      videoRef.current.srcObject = myStream;

      // Check stream status
      const videoTracks = myStream.getVideoTracks();
      const audioTracks = myStream.getAudioTracks();

      console.log(
        `MyVideo: Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`
      );

      setStreamInfo({
        video: videoTracks.length > 0 && videoTracks[0].enabled,
        audio: audioTracks.length > 0 && audioTracks[0].enabled,
      });
    }
  }, [myStream]);

  return (
    <div className="my-video-container">
      <video
        ref={videoRef}
        width="240"
        height="180"
        autoPlay
        playsInline
        muted
        style={{
          border: "3px solid #4CAF50",
          backgroundColor: "#000",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
        }}
      />
      <div
        className="stream-status"
        style={{ fontSize: "12px", marginTop: "5px" }}
      >
        Video: {streamInfo.video ? "✅" : "❌"} | Audio:{" "}
        {streamInfo.audio ? "✅" : "❌"}
      </div>
    </div>
  );
}

export default MyVideo;
