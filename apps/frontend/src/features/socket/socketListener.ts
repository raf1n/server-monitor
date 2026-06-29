import { createListenerMiddleware } from "@reduxjs/toolkit";
import { logoutAction } from "@/store/actions";
import { selectServer } from "@/features/servers/serversSlice";
import { connectSocket, reconnectSocket } from "./socketActions";
import * as socketService from "./socketService";

export const socketMiddleware = createListenerMiddleware();

socketMiddleware.startListening({
  actionCreator: connectSocket,
  effect: (_, listenerApi) => {
    socketService.connect(listenerApi.dispatch, listenerApi.getState);
  },
});

socketMiddleware.startListening({
  actionCreator: reconnectSocket,
  effect: (_, listenerApi) => {
    socketService.disconnect();
    socketService.connect(listenerApi.dispatch, listenerApi.getState);
  },
});

socketMiddleware.startListening({
  actionCreator: selectServer,
  effect: (action, listenerApi) => {
    socketService.switchRoom(action.payload, listenerApi.dispatch, listenerApi.getState);
  },
});

socketMiddleware.startListening({
  actionCreator: logoutAction,
  effect: () => {
    socketService.disconnect();
  },
});
