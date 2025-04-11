import React from "react";

const MyVideo = ({ localStream }) => {
  return (
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
        style={{
          width: "200px",
          height: "150px",
          border: "2px solid #ccc",
          borderRadius: "8px",
        }}
      />
    </div>
  );
};

export default MyVideo;
