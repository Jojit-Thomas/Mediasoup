/// <reference types="socket.io-client" />
import React, { useState, useEffect } from 'react';
import { Socket } from "socket.io-client"
import { decrement, increment } from './features/mediasoupSlice';
import { useDispatch, useSelector } from 'react-redux';

interface Props {
  socket : Socket
}

const Chat: React.FC<Props> = ({socket}) => {

  // const [state, setState] = useState(0);

  // useEffect(() => {
  //   for (let i = 0; i < 5; i++) {
  //     setTimeout(() => {
  //       setState(prev => ++prev);
  //       print(state)
  //     }, i * 1000);
  //   }
  // },[])

  // function print(state) {
  //   console.log(state);
  // }

  // return <div>{state}</div>;
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastPong, setLastPong] = useState("");

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('pong', () => {
      let date = new Date().toISOString()
      setLastPong(date);
    });

    socket.on("connect_error", (err) => {
      console.log(`connect_error due to ${err.message}`);
    });
    socket.on("connect_failed", (err) => console.log(err))

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('pong');
    };
  }, []);

  const sendPing = () => {
    socket.emit('ping');
  }
//@ts-ignore
  const count = useSelector(state => state.mediasoup.count)
  const dispatch = useDispatch();

  return (
    <div>
      <p>Connected {' : ' + isConnected}</p>
      <p>Last pong: {lastPong || '-'}</p>
      <button onClick={sendPing}>Send ping</button>
      <h1>{count}</h1>
      <button onClick={() => dispatch(increment())}>increment</button>
      <button onClick={() => dispatch(decrement())}>decrement</button>
    </div>
  );
}

export default Chat;