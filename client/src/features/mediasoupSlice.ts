import { createSlice } from "@reduxjs/toolkit";

interface InitialState {
  count : number,
  // producerLabel : Map<any, any>
}

const initialState : InitialState = {
  count : 0,
  // producerLabel : new Map()
}

export const mediasoupSlice = createSlice({
  name : "mediasoup",
  initialState,
  reducers : {
    increment : (state) => {
      state.count += 1;
    },
    decrement : (state) => {
      state.count -=1;
    },
    // setProducerLabel : (state , action) => {
    //   // return {
    //   //   ...state,
    //   //   [action.payload.type]: action.payload.producer,
    //   // };
    //   state.producerLabel.set(action.payload.type, action.payload.producer)
    // } 
  }
})

export const {increment, decrement} = mediasoupSlice.actions;

export default mediasoupSlice.reducer;