import { createSlice } from "@reduxjs/toolkit";

interface FormValues {
  room_id: string,
  name: string
}

const initialState: FormValues = {
  room_id: "",
  name: ""
}

export const formSlice = createSlice({
  name: "formValues",
  initialState,
  reducers : {
    setRoomId : (state, action) => {
      state.room_id = action.payload
    },
    setName : (state, action) => {
      state.name = action.payload
    }
  }
})

export const {setRoomId, setName} = formSlice.actions;

export default formSlice.reducer;