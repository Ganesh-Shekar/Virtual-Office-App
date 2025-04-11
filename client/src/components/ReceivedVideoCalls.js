import React, { useEffect, useState, useRef } from "react";
import Peer from "simple-peer";
import {
  getIceServers,
  attachRTCPeerConnectionListeners,
} from "../utils/webrtcHelpers";

/**
 * Component that handles a single received offer.
 * Creates a non-initiator Peer, signals the offer, and sends an answer back.
 */
function ReceivedVideoCall({
  offer,
  socket,
  myStream,
  mySocketId,
  onStatusChange = () => {},
}) {
  const peerRef = useRef(null);
  const [connectionState, setConnectionState] = useState("initializing");
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const updateStatus = (status) => {
    console.log(`ReceivedVideoCall from ${offer.from}: ${status}`);
    setConnectionState(status);
    onStatusChange(status);
  };

  useEffect(() => {
    if (!offer || !myStream || !mySocketId) {
      updateStatus("missing offer, stream, or socket ID");
      return;
    }

    updateStatus("creating peer");
    console.log(`Creating non-initiator peer for offer from: ${offer.from}`);
    setConnectionAttempts((prev) => prev + 1);

    try {
      // Create a Peer in non-initiator mode
      const peer = new Peer({
        initiator: false,
        trickle: true, // Changed to true to allow ICE candidates to flow
        stream: myStream,
        config: getIceServers(),
      });

      // When this peer generates its own signaling data (SDP/ICE),
      // send an "answer" back to the caller.
      peer.on("signal", (signalData) => {
        console.log(`Receiver generated answer for ${offer.from}:`, signalData);
        updateStatus(`signaling (${signalData.type || "candidate"})`);

        if (socket && socket.connected) {
          console.log(`Sending answer to ${offer.from} from ${mySocketId}`);
          socket.emit("answer", {
            signal: signalData,
            to: offer.from,
            from: mySocketId,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.error(
            "Socket is undefined or disconnected. Cannot emit answer."
          );
          updateStatus("socket error");
        }
      });

      // Apply the incoming offer's signal data to the peer.
      console.log("Applying offer signal:", offer.signal);
      peer.signal(offer.signal);
      updateStatus("processing offer");

      // Event handlers for connection state
      peer.on("connect", () => {
        console.log(`Receiver Peer connected to ${offer.from}!`);
        updateStatus("connected");
      });

      peer.on("error", (err) => {
        console.error(`Receiver Peer error with ${offer.from}:`, err);
        updateStatus(`peer error: ${err.message}`);
      });

      peer.on("close", () => {
        console.log(`Receiver Peer connection with ${offer.from} closed`);
        updateStatus("closed");
      });

      peer.on("stream", (stream) => {
        console.log(`Received remote stream from ${offer.from}:`, stream);
        setRemoteStream(stream);
        updateStatus("streaming");
      });

      // Add detailed connection state logging
      attachRTCPeerConnectionListeners(peer, offer.from);

      peerRef.current = peer;

      // Set up listener for ICE candidates
      const handleCandidate = (data) => {
        if (data.from === offer.from && peerRef.current) {
          console.log(`Received ICE candidate from: ${data.from}`);
          try {
            console.log("Applying ICE candidate:", data.candidate);
            peerRef.current.signal({ candidate: data.candidate });
          } catch (error) {
            console.error(
              `Error applying ICE candidate from ${offer.from}:`,
              error
            );
          }
        }
      };

      // Handle peer errors reported by the server
      const handlePeerError = (error) => {
        if (error.targetId === offer.from) {
          console.error(`Server reported peer error for ${offer.from}:`, error);
          updateStatus(`server error: ${error.type}`);

          // If the sender is not connected, destroy the peer
          if (error.type === "recipient-not-connected" && peerRef.current) {
            console.log(
              `Destroying peer for ${offer.from} due to sender not connected`
            );
            peerRef.current.destroy();
            peerRef.current = null;
          }
        }
      };

      if (socket) {
        socket.on("candidate", handleCandidate);
        socket.on("peerError", handlePeerError);
      }

      // Cleanup when the component unmounts or if offer/myStream changes
      return () => {
        if (peerRef.current) {
          console.log(`Destroying peer for ${offer.from}`);
          peerRef.current.destroy();
          peerRef.current = null;
        }
        if (socket) {
          socket.off("candidate", handleCandidate);
          socket.off("peerError", handlePeerError);
        }
      };
    } catch (error) {
      console.error(`Error creating receiver peer for ${offer.from}:`, error);
      updateStatus(`peer creation error: ${error.message}`);
      return () => {};
    }
  }, [offer, myStream, socket, mySocketId, onStatusChange]);

  // Function to manually retry the connection
  const retryConnection = () => {
    console.log(`Manually retrying connection from ${offer.from}`);

    // Destroy existing peer if any
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Reset state to trigger the useEffect again
    updateStatus("retrying");
    setConnectionAttempts((prev) => prev + 1);
  };

  // Return a component showing connection state and remote video if available
  return (
    <div
      className="received-call"
      style={{ margin: "5px", padding: "5px", border: "1px solid #ddd" }}
    >
      <p>Call from: {offer?.from}</p>
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

/**
 * Component that listens for incoming offers via a Socket.IO connection.
 * For each received offer, it renders a ReceivedVideoCall component to handle it.
 */
function ReceivedVideoCalls({
  socket,
  myStream,
  mySocketId,
  onStatusChange = () => {},
}) {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    if (!socket) {
      console.error("No socket provided to ReceivedVideoCalls");
      return;
    }

    // Listen for the "receiveOffer" event from the server
    const handleReceiveOffer = (offerData) => {
      console.log("Received offer:", offerData);
      console.log(
        `Offer from ${offerData.from} with signal type: ${offerData.signal.type}`
      );
      onStatusChange(`offer received from ${offerData.from}`);

      // Check if we already have this offer (avoid duplicates)
      setOffers((prevOffers) => {
        if (!prevOffers.some((offer) => offer.from === offerData.from)) {
          console.log(`Adding new offer from ${offerData.from} to offers list`);
          return [...prevOffers, offerData];
        }
        console.log(`Ignoring duplicate offer from ${offerData.from}`);
        return prevOffers;
      });
    };

    // Handle user disconnection - remove their offers
    const handleUserDisconnected = (socketId) => {
      console.log(`User disconnected: ${socketId}, removing their offers`);
      setOffers((prevOffers) =>
        prevOffers.filter((offer) => offer.from !== socketId)
      );
    };

    socket.on("receiveOffer", handleReceiveOffer);
    socket.on("userDisconnected", handleUserDisconnected);

    // Clean up the event listener on component unmount.
    return () => {
      socket.off("receiveOffer", handleReceiveOffer);
      socket.off("userDisconnected", handleUserDisconnected);
    };
  }, [socket, onStatusChange]);

  return (
    <div className="received-calls-container" style={{ marginTop: "1rem" }}>
      {/* Render a ReceivedVideoCall for each offer */}
      {offers.map((offer, idx) => (
        <ReceivedVideoCall
          key={`${offer.from}-${idx}`}
          offer={offer}
          socket={socket}
          myStream={myStream}
          mySocketId={mySocketId}
          onStatusChange={(status) =>
            onStatusChange(`${offer.from}: ${status}`)
          }
        />
      ))}
    </div>
  );
}

export default ReceivedVideoCalls;
