import { createSlice } from "@reduxjs/toolkit";

const allCharactersSlice = createSlice({
  name: "allCharacters",
  initialState: {
    users: {},
    socketToUserMap: {}, // New field to map socket IDs to user IDs
  },
  reducers: {
    update(state, action) {
      console.log(
        "allCharactersSlice update updatedUserList: ",
        action.payload
      );
      const updatedUserList = action.payload;
      state.users = updatedUserList;
    },
    updateSocketId(state, action) {
      const { userId, socketId } = action.payload;
      console.log(`Updating socket ID for user ${userId} to ${socketId}`);

      // Create user if they don't exist
      if (!state.users[userId]) {
        state.users[userId] = { id: userId };
      }

      // Update the socket ID
      state.users[userId].socketId = socketId;

      // Update the reverse mapping
      state.socketToUserMap[socketId] = userId;
    },
    removeSocketId(state, action) {
      const userId = action.payload;
      console.log(`Removing socket ID for user ${userId}`);

      if (state.users[userId]) {
        const oldSocketId = state.users[userId].socketId;

        // Remove from the reverse mapping
        if (oldSocketId) {
          delete state.socketToUserMap[oldSocketId];
        }

        // Remove from the user
        delete state.users[userId].socketId;
      }
    },
    userDisconnected(state, action) {
      const socketId = action.payload;
      console.log(`User with socket ID ${socketId} disconnected`);

      // Find the user ID for this socket ID
      const userId = state.socketToUserMap[socketId];

      if (userId && state.users[userId]) {
        // Remove the socket ID from the user
        delete state.users[userId].socketId;

        // Remove from the reverse mapping
        delete state.socketToUserMap[socketId];
      }
    },
  },
});

export const { update, updateSocketId, removeSocketId, userDisconnected } =
  allCharactersSlice.actions;

// Selector to find a user ID by socket ID
export const selectUserIdBySocketId = (state, socketId) => {
  return state.allCharacters.socketToUserMap[socketId];
};

export default allCharactersSlice.reducer;
