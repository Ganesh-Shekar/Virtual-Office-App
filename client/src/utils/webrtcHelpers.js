import Peer from "simple-peer";

/**
 * Utility functions for WebRTC and socket handling
 */

// Extract ICE servers configuration to a single place for consistency
export const getIceServers = () => {
  return {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  };
};

// Helper to log WebRTC connection state changes
export const attachRTCPeerConnectionListeners = (peer, peerId) => {
  if (!peer || !peer._pc) return;

  // Log ICE connection state changes
  peer._pc.addEventListener("iceconnectionstatechange", () => {
    const state = peer._pc.iceConnectionState;
    console.log(`ICE connection state with ${peerId}: ${state}`);
  });

  // Log signaling state changes
  peer._pc.addEventListener("signalingstatechange", () => {
    const state = peer._pc.signalingState;
    console.log(`Signaling state with ${peerId}: ${state}`);
  });

  // Log connection state changes
  peer._pc.addEventListener("connectionstatechange", () => {
    const state = peer._pc.connectionState;
    console.log(`Connection state with ${peerId}: ${state}`);
  });

  // Log negotiation needed events
  peer._pc.addEventListener("negotiationneeded", () => {
    console.log(`Negotiation needed with ${peerId}`);
  });

  // Log ICE candidate errors
  peer._pc.addEventListener("icecandidateerror", (event) => {
    console.error(`ICE candidate error with ${peerId}:`, event);
  });
};

// Helper to create a peer with consistent options
export const createPeer = (options) => {
  const { initiator, stream, trickle = true } = options;

  return new Peer({
    initiator,
    trickle,
    stream,
    config: getIceServers(),
  });
};
