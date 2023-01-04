import React from 'react';
import logo from './logo.svg';
import './App.css';
import Chat from './Chat';
import io, { Socket } from 'socket.io-client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Lobby from './Lobby';

const socketIO: any = io("ws://localhost:3003");

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
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path='/lobby' index element={<Lobby key="asdf" socket={socket} />} />
          <Route path='/chat' element={<Chat socket={socket} />} />
          <Route path='*' element={<h1 className='text-3xl font-bold'>Not found...</h1>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
