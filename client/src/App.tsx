import React, { useEffect } from 'react';
import './App.css';
import Chat from './Chat';
import io, { Socket } from 'socket.io-client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Test from './Text';

const socketIO: any = io("wss://api.meet.jojit.ml");
// const socketIO: any = io("ws://localhost:3003");

export class CustomSocket extends Socket {
  request !: Function
}

let socket = socketIO as CustomSocket

socket.request = function request(type: string, data = {}) {
  return new Promise((resolve, reject) => {
    socket.emit(type, data, (data: any) => {
      if (data.error) {
        reject(data.error)
      } else {
        resolve(data)
      }
    })
  })
}


function App() {

  useEffect(() => {
    socket.on("disconnect", (e) => {
      console.log("disconnecting...... ", e)
    })
  }, [])

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path='/' index element={<Chat key="1" socket={socket} />} />
          {/* <Route path='/lobby/:roomId' index element={<Chat key="asdf" socket={socket} />} /> */}
          <Route path='/test' element={<Test socket={socket} />} />
          <Route path='*' element={<h1 className='text-3xl font-bold'>Not found...</h1>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
