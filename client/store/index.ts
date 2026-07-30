import { configureStore } from "@reduxjs/toolkit";
import appConfigReducer from "./slices/appConfigSlice";
import authReducer from "./slices/authSlice";
import casesReducer from "./slices/casesSlice";
import clientReducer from "./slices/clientSlice";
import portalReducer from "./slices/portalSlice";

export const store = configureStore({
  reducer: {
    appConfig: appConfigReducer,
    auth: authReducer,
    cases: casesReducer,
    client: clientReducer,
    portal: portalReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
