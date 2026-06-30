import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "demo";

export interface SocketState {
  connection: ConnectionState;
}

const initialState: SocketState = {
  connection: "connecting",
};

const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    setConnection(state, action: PayloadAction<ConnectionState>) {
      state.connection = action.payload;
    },
  },
});

export const { setConnection } = socketSlice.actions;
export default socketSlice.reducer;
