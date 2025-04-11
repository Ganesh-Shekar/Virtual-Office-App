import React, { useEffect, useState } from "react";
import { connect, useDispatch } from "react-redux";
import { MY_CHARACTER_INIT_CONFIG } from "./characterConstants";
import { updateSocketId } from "./slices/allCharactersSlice";
import MyVideo from "./MyVideo";
import InitiatedVideoCall from "./InitiatedVideoCalls";
import ReceivedVideoCalls from "./ReceivedVideoCalls";

function VideoCalls({ myCharacterData, otherCharactersData, webrtcSocket }) {
  const dispatch = useDispatch();
  const [myStream, setMyStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [debugMode, setDebugMode] = useState(true); // Set to true by default for debugging
  const [directSocketId, setDirectSocketId] = useState(null);

  // Get local media stream on mount
  useEffect(() => {
    async function getLocalMedia() {
      try {
        console.log("Requesting user media...");
        const constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: true,
        };

        console.log("Media constraints:", constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Verify we have tracks
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        console.log("Local stream obtained:", stream);
        console.log(
          `Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`
        );

        if (videoTracks.length === 0) {
          console.warn("No video tracks in the stream!");
        }

        if (audioTracks.length === 0) {
          console.warn("No audio tracks in the stream!");
        }

        // Log track constraints and settings
        if (videoTracks.length > 0) {
          console.log("Video track settings:", videoTracks[0].getSettings());
          console.log(
            "Video track constraints:",
            videoTracks[0].getConstraints()
          );
        }

        setMyStream(stream);
        setConnectionStatus("media ready");
      } catch (error) {
        console.error("Error accessing local media devices:", error);
        setMediaError(error.message || "Could not access camera/microphone");
        setConnectionStatus("media error");
      }
    }
    getLocalMedia();

    // Cleanup function to stop all tracks when component unmounts
    return () => {
      if (myStream) {
        console.log("Stopping all media tracks");
        myStream.getTracks().forEach((track) => {
          console.log(`Stopping track: ${track.kind}`);
          track.stop();
        });
      }
    };
  }, []);

  // Directly capture socket ID from the socket connection
  useEffect(() => {
    if (webrtcSocket) {
      console.log("Setting up socket ID listener");

      const handleMe = (id) => {
        console.log("Received my socket ID directly:", id);
        setDirectSocketId(id);

        // Update Redux state with the socket ID
        dispatch(
          updateSocketId({
            userId: MY_CHARACTER_INIT_CONFIG.id,
            socketId: id,
          })
        );
      };

      webrtcSocket.on("me", handleMe);

      return () => {
        webrtcSocket.off("me", handleMe);
      };
    }
  }, [webrtcSocket, dispatch]);

  // Verify socket connection
  useEffect(() => {
    if (webrtcSocket) {
      console.log("Socket connected:", webrtcSocket.connected);
      setConnectionStatus(
        webrtcSocket.connected ? "socket connected" : "socket disconnected"
      );

      // Test event to verify connection
      webrtcSocket.emit("ping", { time: new Date().toISOString() });

      // Listen for reconnection events
      const handleConnect = () => {
        console.log("Socket reconnected");
        setConnectionStatus("socket reconnected");
      };

      const handleDisconnect = () => {
        console.log("Socket disconnected");
        setConnectionStatus("socket disconnected");
      };

      const handlePong = (data) => {
        console.log("Pong received:", data);
        setConnectionStatus("socket verified");
      };

      webrtcSocket.on("connect", handleConnect);
      webrtcSocket.on("disconnect", handleDisconnect);
      webrtcSocket.on("pong", handlePong);

      return () => {
        webrtcSocket.off("connect", handleConnect);
        webrtcSocket.off("disconnect", handleDisconnect);
        webrtcSocket.off("pong", handlePong);
      };
    }
  }, [webrtcSocket]);

  // Log character data and socket IDs for debugging
  useEffect(() => {
    console.log("Character data:", myCharacterData);
    console.log("My socket ID from character data:", myCharacterData?.socketId);
    console.log("My direct socket ID:", directSocketId);
    console.log("Other characters data:", otherCharactersData);

    if (!myCharacterData?.socketId && !directSocketId) {
      console.warn(
        "No socket ID found in character data or directly from socket!"
      );
    }

    if (Object.keys(otherCharactersData).length === 0) {
      console.warn("No other characters found!");
    } else {
      console.log(
        "Other socket IDs:",
        Object.values(otherCharactersData).map((char) => char.socketId)
      );
    }
  }, [myCharacterData, directSocketId, otherCharactersData]);

  // Use direct socket ID if available, otherwise fall back to character data
  const effectiveSocketId = directSocketId || myCharacterData?.socketId;

  return (
    <div className="video-calls-container">
      {/* Connection status and debug controls */}
      <div className="connection-status">
        Status: {connectionStatus}
        <button
          onClick={() => setDebugMode(!debugMode)}
          style={{ marginLeft: "10px" }}
        >
          {/* {debugMode ? "Hide Debug Info" : "Show Debug Info"} */}
        </button>
      </div>

      {/* Error message if media access fails */}
      {mediaError && (
        <div
          className="error-message"
          style={{ color: "red", margin: "10px 0" }}
        >
          Error: {mediaError}. Please ensure camera and microphone permissions
          are granted.
        </div>
      )}

      {/* Debug information */}

      {/* Display your own video feed */}
      {myStream && <MyVideo myStream={myStream} />}

      {/* For each remote user, create an InitiatedVideoCall instance */}
      {myStream &&
        effectiveSocketId &&
        Object.keys(otherCharactersData).map((userId) => {
          const otherUserData = otherCharactersData[userId];
          if (!otherUserData.socketId) {
            console.warn(`No socket ID for user ${userId}`);
            return null;
          }

          console.log(
            `Creating InitiatedVideoCall for ${otherUserData.socketId}`
          );
          return (
            <InitiatedVideoCall
              key={otherUserData.socketId}
              otherSocketId={otherUserData.socketId}
              mySocketId={effectiveSocketId}
              myStream={myStream}
              webrtcSocket={webrtcSocket}
              onStatusChange={(status) =>
                setConnectionStatus(
                  `outgoing to ${otherUserData.socketId}: ${status}`
                )
              }
            />
          );
        })}

      {/* Render ReceivedVideoCalls once to handle incoming offers for all remote users */}
      {webrtcSocket && myStream && (
        <ReceivedVideoCalls
          socket={webrtcSocket}
          myStream={myStream}
          mySocketId={effectiveSocketId}
          onStatusChange={(status) =>
            setConnectionStatus(`incoming: ${status}`)
          }
        />
      )}
    </div>
  );
}

// mapStateToProps splits out your own character from the others
const mapStateToProps = (state) => {
  console.log("Full Redux state:", state);
  const myCharacterData =
    state.allCharacters.users[MY_CHARACTER_INIT_CONFIG.id];
  console.log("My character data from Redux:", myCharacterData);

  const otherCharactersData = Object.keys(state.allCharacters.users || {})
    .filter((id) => id !== MY_CHARACTER_INIT_CONFIG.id)
    .reduce((acc, userId) => {
      acc[userId] = state.allCharacters.users[userId];
      return acc;
    }, {});
  return { myCharacterData, otherCharactersData };
};

export default connect(mapStateToProps)(VideoCalls);
