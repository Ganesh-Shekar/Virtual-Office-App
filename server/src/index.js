const express = require("express");
const app = express();
const cors = require("cors");
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

// Enhanced logging function
const logWithTime = (message, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data || "");
};

// Track connected users with their socket IDs and additional info
const connectedUsers = new Map();

const PORT = process.env.PORT || 8080;
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Endpoint to get connected users
app.get("/connected-users", (req, res) => {
  const users = Array.from(connectedUsers.entries()).map(([id, data]) => ({
    id,
    connectionTime: data.connectionTime,
    lastActivity: data.lastActivity,
  }));
  res.json(users);
});

// Broadcast updated user list to all clients
function broadcastUserList() {
  const userList = Array.from(connectedUsers.entries()).map(
    ([socketId, data]) => ({
      socketId,
      lastActivity: data.lastActivity,
      // Add any other user info you want to share
    })
  );

  logWithTime(`Broadcasting updated user list with ${userList.length} users`);
  io.emit("userList", userList);
}

io.on("connection", (socket) => {
  logWithTime("New client connected:", socket.id);

  // Track user connection
  connectedUsers.set(socket.id, {
    connectionTime: new Date(),
    lastActivity: new Date(),
  });

  // Update last activity on any event
  const updateActivity = () => {
    if (connectedUsers.has(socket.id)) {
      connectedUsers.get(socket.id).lastActivity = new Date();
    }
  };

  // Inform the client of its own socket ID
  // This is critical for WebRTC signaling
  logWithTime(`Sending 'me' event to ${socket.id}`);
  socket.emit("me", socket.id);

  // Broadcast updated user list to all clients
  broadcastUserList();

  // Ping handler for connection testing
  socket.on("ping", (data) => {
    logWithTime(`Ping received from ${socket.id}:`, data);
    socket.emit("pong", {
      time: new Date().toISOString(),
      yourId: socket.id, // Redundantly send the socket ID again
      connectedUsers: connectedUsers.size,
    });
    updateActivity();
  });

  // Listen for senderOffer signal from a client and forward it to the recipient
  socket.on("senderOffer", (data) => {
    const fromId = data.callFromUserSocketId || socket.id;
    const toId = data.callToUserSocketId;

    logWithTime(`Offer received from ${fromId} to ${toId}`, {
      signalType: data.signal?.type,
      timestamp: data.timestamp,
    });

    updateActivity();

    // Check if the recipient is connected
    const recipientConnected = connectedUsers.has(toId);
    logWithTime(
      `Recipient ${toId} is ${
        recipientConnected ? "connected" : "not connected"
      }`
    );

    // Broadcast the offer to the specific recipient
    if (toId && recipientConnected) {
      logWithTime(`Forwarding offer to ${toId}`);
      socket.to(toId).emit("receiveOffer", {
        from: fromId,
        signal: data.signal,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Log error if recipient not connected
      logWithTime(
        `Cannot forward offer: recipient ${toId} not connected or not specified`
      );

      // Notify sender that recipient is not available
      socket.emit("peerError", {
        type: "recipient-not-connected",
        targetId: toId,
        message: `Recipient ${toId} is not connected`,
      });
    }
  });

  // Listen for answer messages and forward them to the specific recipient
  socket.on("answer", (data) => {
    logWithTime(`Answer received from ${socket.id} to ${data.to}`, {
      signalType: data.signal?.type,
      timestamp: data.timestamp,
    });
    updateActivity();

    // Check if the recipient is connected
    const recipientConnected = connectedUsers.has(data.to);

    if (data.to && recipientConnected) {
      logWithTime(`Forwarding answer to ${data.to}`);
      socket.to(data.to).emit("receiveAnswer", {
        from: socket.id,
        signal: data.signal,
        timestamp: new Date().toISOString(),
      });
    } else {
      logWithTime(
        `Cannot forward answer: recipient ${data.to} not connected or not specified`
      );

      // Notify sender that recipient is not available
      socket.emit("peerError", {
        type: "recipient-not-connected",
        targetId: data.to,
        message: `Recipient ${data.to} is not connected`,
      });
    }
  });

  // Listen for ICE candidates and forward them
  socket.on("candidate", (data) => {
    logWithTime(`ICE candidate received from ${socket.id}`, {
      toId: data.to,
      candidateType: data.candidate?.candidate?.split(" ")[7], // Extract candidate type for logging
    });
    updateActivity();

    // Check if the recipient is connected
    const recipientConnected = data.to && connectedUsers.has(data.to);

    if (recipientConnected) {
      logWithTime(`Forwarding ICE candidate to ${data.to}`);
      socket.to(data.to).emit("candidate", {
        from: socket.id,
        candidate: data.candidate,
      });
    } else {
      logWithTime(
        `Cannot forward ICE candidate: recipient ${data.to} not connected or not specified`
      );
    }
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    logWithTime("Client disconnected:", socket.id);
    connectedUsers.delete(socket.id);

    // Notify all clients about the disconnection
    socket.broadcast.emit("userDisconnected", socket.id);

    // Broadcast updated user list
    broadcastUserList();
  });
});

server.listen(PORT, () => logWithTime(`Server is running on port ${PORT}`));
