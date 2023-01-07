import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setName, setRoomId } from './features/formValues';
import { RootState } from './redux/store';
import styled from 'styled-components';
import { useParams, useSearchParams } from 'react-router-dom';

const Lobby = ({ handleJoin }: { handleJoin: () => void }) => {

  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('roomId')) dispatch(setRoomId(searchParams.get('roomId')))
    if (searchParams.get('name')) dispatch(setName(searchParams.get('name')))
  }, [])

  const { room_id, name } = useSelector((state: RootState) => state.formValues)

  useEffect(() => {
    if (room_id) {
      searchParams.set('roomId', room_id)
      setSearchParams([...searchParams.entries()])
    }
  }, [room_id])

  useEffect(() => {
    if (name) {
      searchParams.set('name', name)
      setSearchParams([...searchParams.entries()])
    }
  }, [name])


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // setformValues({ ...formValues, [e.target.name]: e.target.value });
    if (e.target.name == "room_id") {
      dispatch(setRoomId(e.target.value))
    } else if (e.target.name === "name") {
      dispatch(setName(e.target.value))
    }
  }

  useEffect(() => console.log("lobby page"), [])



  return (
    <Box>
      <Title className='mt-2 mb-5 text-4xl font-semibold tracking-wide uppercase font-Rubik-Microbe'>MeetIn</Title>
      <div className="relative w-11/12 mx-auto mb-4">
        <input onChange={handleChange} id="name" name="room_id" type="text" value={room_id}
          className="w-full h-12 pl-3 text-gray-900 placeholder-transparent border-2 rounded-lg appearance-none border-violet-300 peer focus:outline-none focus:border-purple-600 bg-transparent" placeholder='room name' />
        <label htmlFor="name"
          className="absolute left-1 -top-3 pointer-events-none text-gray-600 text-sm transition-all duration-200 ease-in-outbg-white peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-3 peer-focus:text-gray-600 peer-focus:text-sm bg-white-blur2 px-2 ">
          Room Name
        </label>
      </div>
      <div className="relative w-11/12 mx-auto mb-4">
        <input onChange={handleChange} id="name" name="name" type="text" value={name}
          className="w-full h-12 pl-3 text-gray-900 placeholder-transparent border-2 rounded-lg appearance-none border-violet-300 peer focus:outline-none focus:border-purple-600 bg-transparent" placeholder='room name' />
        <label htmlFor="name"
          className="absolute pointer-events-none left-1 -top-3 text-gray-600 text-sm transition-all duration-200 ease-in-outbg-white peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-3 peer-focus:text-gray-600 peer-focus:text-sm bg-white-blur   px-2 ">
          Username
        </label>
      </div>
      <button onClick={() => handleJoin()} className='w-1/4 self-end border-2 border-violet-300 text-gray-500 mr-4 rounded-lg h-10 hover:bg-violet-600 hover:text-white-1000'> Join </button>
    </Box>
  )
}

export default Lobby


const Title = styled.h1`
  background : radial-gradient(at 80% 0%, hsla(189,100%,56%,1) 0px, transparent 100%),
  radial-gradient(at 0% 50%, hsla(355,100%,93%,1) 0px, transparent 100%),
  radial-gradient(at 80% 50%, hsla(340,100%,76%,1) 0px, transparent 100%),
  radial-gradient(at 0% 100%, hsla(269,100%,77%,1) 0px, transparent 100%),
  radial-gradient(at 0% 0%, hsla(343,100%,76%,1) 0px, transparent 100%);
  -webkit-background-clip : text;
  -webkit-text-fill-color : transparent;
`


const Box = styled.div`
  width : calc(12rem + 10vw);
  min-height : fit-content;
  padding : calc(0.2rem + 3vh) 0rem;
  background-color: rgba(255,255,255,0.4);
  border-radius: 20px;
  box-shadow: 0px 0 31px 0px rgb(0 0 0 / 10%);
  display : flex;
  flex-direction : column;
  justify-content : flex-start;
`

