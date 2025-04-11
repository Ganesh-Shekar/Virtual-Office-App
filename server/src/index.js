const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
const PORT = process.env.PORT || 8080;
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Store connected users
const connectedUsers = new Set();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  connectedUsers.add(socket.id);
  socket.emit("me", socket.id);

  // Notify all users about the new connection
  io.emit("user-connected", socket.id);

  // If there are other users, establish connection with them
  if (connectedUsers.size > 1) {
    connectedUsers.forEach((userId) => {
      if (userId !== socket.id) {
        console.log(`Initiating connection between ${socket.id} and ${userId}`);
        io.to(userId).emit("initiate-connection", { targetUserId: socket.id });
        io.to(socket.id).emit("initiate-connection", { targetUserId: userId });
      }
    });
  }

  // Handle video call signaling
  socket.on("video-offer", (data) => {
    console.log(`Offer received from ${socket.id} to ${data.targetUserId}`);
    io.to(data.targetUserId).emit("video-offer", {
      ...data,
      senderId: socket.id,
    });
  });

  socket.on("video-answer", (data) => {
    console.log(`Answer received from ${socket.id} to ${data.targetUserId}`);
    io.to(data.targetUserId).emit("video-answer", {
      ...data,
      senderId: socket.id,
    });
  });

  socket.on("ice-candidate", (data) => {
    console.log(
      `ICE candidate received from ${socket.id} to ${data.targetUserId}`
    );
    io.to(data.targetUserId).emit("ice-candidate", {
      ...data,
      senderId: socket.id,
    });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    connectedUsers.delete(socket.id);
    io.emit("user-disconnected", socket.id);
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
