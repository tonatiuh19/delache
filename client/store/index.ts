import { configureStore } from "@reduxjs/toolkit";
import appConfigReducer from "./slices/appConfigSlice";
import authReducer from "./slices/authSlice";
import casesReducer from "./slices/casesSlice";
import portalReducer from "./slices/portalSlice";

export const store = configureStore({
  reducer: {
    appConfig: appConfigReducer,
    auth: authReducer,
    cases: casesReducer,
    portal: portalReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
