import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { UserProfile } from "./types";
import { logoutAction } from "@/store/actions";
import { authApi } from "./authApi";

export interface AuthState {
  user: UserProfile | null;
  authLoading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  authLoading: true,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.authLoading = false;
    },
    clearCredentials(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.authLoading = false;
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.authLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logoutAction, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.authLoading = false;
    });
    builder.addMatcher(authApi.endpoints.getMe.matchFulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.authLoading = false;
    });
    builder.addMatcher(authApi.endpoints.getMe.matchRejected, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.authLoading = false;
    });
  },
});

export const { setCredentials, clearCredentials, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;
