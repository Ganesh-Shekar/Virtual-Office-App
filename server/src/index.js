const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => {
        res.send('Hello World');
});

io.on("connection", (socket) => {
    socket.emit("me", socket.id);
});
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
