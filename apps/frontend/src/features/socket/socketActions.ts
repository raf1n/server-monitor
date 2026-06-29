import { createAction } from "@reduxjs/toolkit";

export const connectSocket = createAction("socket/connect");
export const reconnectSocket = createAction("socket/reconnect");
