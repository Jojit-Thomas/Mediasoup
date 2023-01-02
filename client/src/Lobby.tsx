import React, { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import styled from "styled-components"
import * as mediasoupClient from 'mediasoup-client';
import { CustomSocket } from './App'
import { RtpCapabilities } from 'mediasoup-client/lib/RtpParameters'
import { DtlsParameters, Transport } from 'mediasoup-client/lib/Transport'
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer, ToastOptions, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import moment from "moment"

interface Props {
  socket: CustomSocket
}

interface Chat {
  name: string,
  message: string,
  date: string,
  from: string
}


const mediaType = {
  audio: 'Audio',
  video: 'Camera',
  screen: 'Screen'
}

let device: any;

let consumerTransport: any;

let producerTransport: any;


let posterImg = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcReBktlht1LiE8otpg63cjoy6xopBUWSlDouAHGwHjJ-8LTESIm4ZAkpJc_ma1oR1R1JyE&usqp=CAU"


let producerLabel = new Map();

let videoConsumerCountRef = 0;


const errorToastOptions: ToastOptions = {
  position: 'bottom-right',
  autoClose: 5000,
  pauseOnHover: true,
  pauseOnFocusLoss: false,
  draggable: true,
  type: "error"
}

const infoToastOptions: ToastOptions = {
  position: 'bottom-left',
  autoClose: 1500,
  pauseOnHover: true,
  pauseOnFocusLoss: false,
  draggable: true,
  type: "info"
}

const Lobby: React.FC<Props> = ({ socket }) => {

  const navigate = useNavigate();

  interface FormValues {
    room_id: string,
    name: string
  }

  const [formValues, setformValues] = React.useState<FormValues>({
    room_id: "",
    name: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setformValues({ ...formValues, [e.target.name]: e.target.value });
  }

  const dispatch = useDispatch();


  useEffect(() => {

    console.log("mounting....")
  }, [])

  //===========================================================================================================================================================

  const [consumers, setConsumers] = useState(new Map());
  const [producers, setProducers] = useState(new Map());
  const [producerDevices, setProducerDevices] = useState<string[]>([]);
  const [videoConsumerCount, setVideoConsumerCount] = useState<number>(0)

  // useEffect(() => setConsumerCount(producerDevices.length),[producerDevices])

  useEffect(() => console.log("consumer count : ", videoConsumerCount), [videoConsumerCount])

  const loadDevice = async (routerRtpCapabilities: RtpCapabilities) => {
    let device = undefined;

    try {
      device = new mediasoupClient.Device()
      console.log(device)
    } catch (error: any) {
      if (error.name === 'UnsupportedError') {
        console.error('Browser not supported')
        alert('Browser not supported')
      }
      console.error(error)
    }
    await device!.load({
      routerRtpCapabilities
    })
    return device
  }

  const [isJoined, setIsJoined] = useState(false)

  const initTransports = async (device: mediasoupClient.types.Device) => {
    // init producerTransport
    {
      const data = await socket.request('createWebRtcTransport', {
        forceTcp: false,
        rtpCapabilities: device.rtpCapabilities
      })

      if (data.error) {
        console.error(data.error)
        return
      }

      producerTransport = await device.createSendTransport(data)

      if (producerTransport) {
        producerTransport!.on(
          'connect',
          //@ts-ignore
          async function ({ dtlsParameters }, callback: Function, errback: Function) {
            socket
              .request('connectTransport', {
                dtlsParameters,
                transport_id: data.id
              })
              .then(callback)
              .catch(errback)
          }
        )

        producerTransport!.on(
          'produce',
          //@ts-ignore
          async function ({ kind, rtpParameters }, callback, errback) {
            try {
              const { producer_id } = await socket.request('produce', {
                producerTransportId: producerTransport!.id,
                kind,
                rtpParameters
              })
              callback({
                id: producer_id
              })
            } catch (err) {
              //@ts-ignore
              errback(err)
            }
          }
        )

        producerTransport!.on(
          'connectionstatechange',
          function (state: string) {
            switch (state) {
              case 'connecting':
                break

              case 'connected':
                //localVideo.srcObject = stream
                break

              case 'failed':
                producerTransport!.close()
                break

              default:
                break
            }
          }
        )
      }

    }

    // init consumerTransport
    {
      const data = await socket.request('createWebRtcTransport', {
        forceTcp: false
      })

      if (data.error) {
        console.error(data.error)
        return
      }

      // only one needed
      consumerTransport = device.createRecvTransport(data)
      console.log(data.id)
      if (consumerTransport) {
        consumerTransport!.on(
          'connect',
          //@ts-ignore
          function ({ dtlsParameters }, callback, errback) {
            socket
              .request('connectTransport', {
                transport_id: data.id,
                dtlsParameters
              })
              .then(callback)
              .catch(errback)
          }
        )

        consumerTransport!.on(
          'connectionstatechange',
          async function (state: string) {
            switch (state) {
              case 'failed':
                consumerTransport!.close()
                break
              default:
                break
            }
          }
        )
      }
    }
  }


  const joinRoom = async ({ name, room_id }: { name: string, room_id: string }) => {
    let user = await socket.request('join', { name, room_id })
    console.log("user joined to room", user)
    const data = await socket.request('getRouterRtpCapabilities')
    let devis = await loadDevice(data)
    if (devis) {
      // setDevice(devis)
      device = devis
    } else {
      console.log("error device is undefined")
    }
    await initTransports(device!)
    console.log("success")
    socket.emit('getProducers')
  }


  const exit = (offline = false) => {
    let clean = function () {
      setIsJoined(false)
      consumerTransport!.close()
      producerTransport!.close()
      socket.off('disconnect')
      socket.off('newProducers')
      socket.off('consumerClosed')
    }

    if (!offline) {
      socket
        .request('exitRoom')
        .then((e: any) => console.log(e))
        .catch((e: any) => console.warn(e))
        .finally(
          function () {
            clean()
          }
        )
    } else {
      clean()
    }
    navigate("/lobby")
    // event(_EVENTS.exitRoom)
  }

  const removeConsumer = (consumer_id: string) => {
    let parent = document.getElementById(consumer_id) as HTMLDivElement
    let elem = parent.children[0] as HTMLVideoElement | HTMLAudioElement
    if (elem) {
      let elemId = elem.id
      console.log("elemid : ", elemId)
      //@ts-ignore
      elem.srcObject.getTracks().forEach(track => {
        track.stop()
      })
      elem.srcObject = null;
      elem.id = elemId
    } else console.log("It is not present shit ")
    // elem.parentNode.removeChild(elem)
    consumers.delete(consumer_id)
  }

  const getConsumeStream = async (producerId: string) => {
    console.log(device)
    //@ts-ignore
    const { rtpCapabilities } = device
    // console.log("rtp : ", consumerTransport, consumerTransportId)
    const data = await socket.request('consume', {
      rtpCapabilities,
      consumerTransportId: consumerTransport!.id, // might be
      producerId
    })
    const { id, kind, rtpParameters } = data

    let codecOptions = {}
    const consumer = await consumerTransport!.consume({
      id,
      producerId,
      kind,
      rtpParameters,
      //@ts-ignore
      codecOptions
    })

    const stream = new MediaStream()
    stream.addTrack(consumer.track)

    return {
      consumer,
      stream,
      kind
    }
  }

  const asdf = () => { }

  const consume = async (producer_id: string) => {
    console.log("consuming...", videoConsumerCountRef, producer_id)
    getConsumeStream(producer_id).then(
      function ({ consumer, stream, kind }) {
        consumers.set(consumer.id, consumer)
        console.log(kind)
        let elem
        if (kind === 'video') {
          // elem = document.createElement('video')
          elem = document.getElementById(`remoteLocalMediaEL${videoConsumerCountRef}`) as HTMLVideoElement
          // console.log("New Stream: ", stream)
          if (elem) {
            elem.srcObject = stream
            elem.parentElement!.id = consumer.id
            elem.id = elem.id
            elem.autoplay = true
            elem.className = 'vid w-64 h-56 object-cover shadow-[0px_0px_6px_5px_rgba(255,255,255,0.6)] rounded-2xl hidden xsm:block'
          } else console.log("Max limit of elem reached")
          // let remoteVideoEl = document.getElementById("remoteLocalMedia")
          // remoteVideoEl!.appendChild(elem)
          // this.handleFS(elem.id)
          setVideoConsumerCount(prev => ++prev)
          videoConsumerCountRef++;
        } else {
          let div = document.createElement('div')
          div.id = consumer.id
          elem = document.createElement('audio')
          elem.srcObject = stream
          elem.autoplay = true
          let remoteAudioEl = document.getElementById("remoteAudio")
          div.appendChild(elem)
          remoteAudioEl!.appendChild(div)
        }

        consumer.on(
          'trackended',
          function () {
            if (kind === 'video') {
              setVideoConsumerCount(prev => --prev)
            }
            removeConsumer(consumer.id)
          }
        )

        consumer.on(
          'transportclose',
          function () {
            if (kind === 'video') {
              setVideoConsumerCount(prev => --prev)
            }
            removeConsumer(consumer.id)
          }
        )
      }
    )
  }




  const closeProducer = (type: string) => {
    if (!producerLabel.has(type)) {
      console.log('There is no producer for this type ' + type)
      return
    }

    let producer_id = producerLabel.get(type)
    console.log('Close producer', producer_id)

    socket.emit('producerClosed', {
      producer_id
    })

    producers.get(producer_id).close()
    producers.delete(producer_id)
    producerLabel.delete(type)
    let temp = producerDevices.filter(elem => {
      if (elem !== type) return elem
    })
    setProducerDevices(temp)

    if (type !== mediaType.audio) {
      let elem = document.getElementById(producer_id) as HTMLVideoElement
      //@ts-ignore
      elem.srcObject.getTracks().forEach(function (track) {
        track.stop()
      })
      elem.id = "userLocalMediaEL"
      elem.srcObject = null;
      //@ts-ignore
      // elem.parentNode.removeChild(elem)
    }

    // switch (type) {
    //   case mediaType.audio:
    //     this.event(_EVENTS.stopAudio)
    //     break
    //   case mediaType.video:
    //     this.event(_EVENTS.stopVideo)
    //     break
    //   case mediaType.screen:
    //     this.event(_EVENTS.stopScreen)
    //     break
    //   default:
    //     return
    // }
  }




  const produce = async (type: string, deviceId: string | undefined = undefined) => {
    console.log(type)
    let mediaConstraints = {}
    let audio = false
    let screen = false
    switch (type) {
      case mediaType.audio:
        mediaConstraints = {
          audio: {
            deviceId: { exact: deviceId }
          },
          video: false
        }
        audio = true
        break
      case mediaType.video:
        mediaConstraints = {
          audio: false,
          video: {
            width: {
              min: 640,
              ideal: 1920
            },
            height: {
              min: 400,
              ideal: 1080
            },
            deviceId: { exact: deviceId },
            /*aspectRatio: {
                            ideal: 1.7777777778
                        }*/
          }
        }
        break
      case mediaType.screen:
        mediaConstraints = false
        screen = true
        break
      default:
        console.log("wrong")
        return
    }
    console.log("devis : ", device)
    if (!device!.canProduce('video') && !audio) {
      console.error('Cannot produce video')
      return
    }

    console.log('Mediacontraints:', mediaConstraints)
    let stream
    try {
      stream = screen
        ? await navigator.mediaDevices.getDisplayMedia()
        : await navigator.mediaDevices.getUserMedia(mediaConstraints)
      console.log(navigator.mediaDevices.getSupportedConstraints())

      const track = audio ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]
      const params = {
        track
      }
      if (!audio && !screen) {
        //@ts-ignore
        params.encodings = [
          {
            rid: 'r0',
            maxBitrate: 100000,
            //scaleResolutionDownBy: 10.0,
            scalabilityMode: 'S1T3'
          },
          {
            rid: 'r1',
            maxBitrate: 300000,
            scalabilityMode: 'S1T3'
          },
          {
            rid: 'r2',
            maxBitrate: 900000,
            scalabilityMode: 'S1T3'
          }
        ]
        //@ts-ignore
        params.codecOptions = {
          videoGoogleStartBitrate: 1000
        }
      }
      let producer = await producerTransport!.produce(params)

      console.log('Producer', producer)
      producers.set(producer.id, producer)
      setProducers(producers)
      producerLabel.set(type, producer.id)
      //@ts-ignore
      setProducerDevices(prev => [...prev, type])
      let elem: any
      if (!audio) {
        let elem = document.getElementById("userLocalMediaEL") as HTMLVideoElement
        elem.srcObject = stream
        elem.id = producer.id
        elem.autoplay = true
        elem.className = 'vid w-11/12 h-11/12 xsm:w-64 xsm:h-56 object-cover shadow-[0px_0px_6px_5px_rgba(255,255,255,0.6)] rounded-2xl'
        // handleFS(elem.id)
      }

      producer.on('trackended', () => {
        closeProducer(type)
      })

      producer.on('transportclose', () => {
        console.log('Producer transport close')
        if (!audio) {
          elem.srcObject.getTracks().forEach(function (track: any) {
            track.stop()
          })
          elem.parentNode.removeChild(elem)
        }
        producers.delete(producer.id)
        setProducers(producers)
      })

      // switch (type) {
      //   case mediaType.audio:
      //     event(_EVENTS.startAudio)
      //     break
      //   case mediaType.video:
      //     event(_EVENTS.startVideo)
      //     break
      //   case mediaType.screen:
      //     event(_EVENTS.startScreen)
      //     break
      //   default:
      //     return
      // }
    } catch (err: any) {
      if (err.name == "OverconstrainedError" && err.constraint === "deviceId") {
        console.log("The camera is unavailable", err)
        toast(`${type} is unavailable!`, errorToastOptions)
      } else
        console.log('Produce error:', err)
    }
  }

  useEffect(() => console.log("producer label modified :: ", producerLabel), [producerLabel])


  //initSockets
  useLayoutEffect(() => {
    socket.on(
      'consumerClosed',
      function ({ consumer_id }: { consumer_id: string }) {
        console.log('Closing consumer:', consumers.get(consumer_id))
        if (consumers.get(consumer_id).kind === "video") {
          videoConsumerCountRef--;
          setVideoConsumerCount(prev => --prev)
        }
        removeConsumer(consumer_id)
      }
    )

    socket.on(
      'newProducers',
      async function (data) {
        console.log('New producers', data.length)
        for (let { producer_id } of data) {
          await consume(producer_id)
        }
      }
    )

    socket.on('newUser', function (data) {
      console.log("Users : ", data)
      toast(`${data[data.length - 1]} joined `, infoToastOptions)
    })

    socket.on('userLeft', function (data) {
      console.log("User Left  : ", data)
      toast(`${data.name} has left the meeting`, infoToastOptions)
    })

    socket.on('message', function (data) {
      console.log("message : ", data)
      if (data && data.from !== socket.id) setChats(prev => prev ? [...prev, data] : [data])
    })

    socket.on(
      'disconnect',
      function () {
        exit(true)
      }
    )
  }, [])

  //===========================================================================================================================================================

  const handleJoin = () => {
    if (formValues.name === "" || formValues.room_id === "") {
      toast("Name and RoomId is required", errorToastOptions)
      return
    }
    socket.request("createRoom", { room_id: formValues.room_id }).then(() => {
      joinRoom({ name: formValues.name, room_id: formValues.room_id })
      setIsJoined(true)
    })
  }

  useEffect(() => {
    initEnumerateDevices()
    socket.on("newUser", (user) => console.log(user))
    return () => {
      socket.off("newUser")
    }
  }, [])

  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedVideoInput, setSelectedVideoInput] = useState("")
  const [selectedAudioInput, setSelectedAudioInput] = useState("")

  let isEnumerateDevices = false

  function enumerateDevices() {
    // initEnumerateDevices();
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      //@ts-ignore
      setInputDevices(devices)
      devices.forEach((device) => {
        if (device.kind === "videoinput") setSelectedVideoInput(device.deviceId)
        else if (device.kind === "audioinput") setSelectedAudioInput(device.deviceId)
      })
      isEnumerateDevices = true;
    })
  }



  function initEnumerateDevices() {
    // Many browsers, without the consent of getUserMedia, cannot enumerate the devices.
    if (isEnumerateDevices) return

    const constraints = {
      audio: true,
      video: true
    }

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        console.log("stream")
        enumerateDevices()
        stream.getTracks().forEach(function (track) {
          track.stop()
        })
      })
      .catch((err) => {
        console.error('Access denied for audio/video: ', err)
      })
  }

  let arr = Array(5).fill(0)

  const [isZoomed, setIsZoomed] = useState("")

  const [input, setInput] = useState("");

  const [chats, setChats] = useState<Chat[]>()

  const sendChat = () => {
    if (input.trim() === "") {
      toast("Message is empty!", errorToastOptions)
      return
    }
    const chat: Chat = {
      date: new Date().toString(),
      from: socket.id,
      message: input,
      name: formValues.name,
    }
    setChats(prev => prev ? [...prev, chat] : [chat])
    console.log("socket : ", )
    socket.request("message", chat)
    setInput("")
  }

  const messageBox = useRef(null)

  useEffect(() => {
    if (messageBox.current) {
      //@ts-ignore
      messageBox.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats]);



  return (
    <>
      <Container>
        {!isJoined && <Box>
          <Title className='mt-2 mb-5 text-4xl font-semibold tracking-wide uppercase font-Rubik-Microbe'>MeetIn</Title>
          <div className="relative w-11/12 mx-auto mb-4">
            <input onChange={handleChange} id="name" name="room_id" type="text"
              className="w-full h-12 pl-3 text-gray-900 placeholder-transparent border-2 rounded-lg appearance-none border-violet-300 peer focus:outline-none focus:border-purple-600 bg-transparent" placeholder='room name' />
            <label htmlFor="name"
              className="absolute left-1 -top-3 pointer-events-none text-gray-600 text-sm transition-all duration-200 ease-in-outbg-white peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-3 peer-focus:text-gray-600 peer-focus:text-sm bg-white-blur2 px-2 ">
              Room Name
            </label>
          </div>
          <div className="relative w-11/12 mx-auto mb-4">
            <input onChange={handleChange} id="name" name="name" type="text"
              className="w-full h-12 pl-3 text-gray-900 placeholder-transparent border-2 rounded-lg appearance-none border-violet-300 peer focus:outline-none focus:border-purple-600 bg-transparent" placeholder='room name' />
            <label htmlFor="name"
              className="absolute pointer-events-none left-1 -top-3 text-gray-600 text-sm transition-all duration-200 ease-in-outbg-white peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-3 peer-focus:text-gray-600 peer-focus:text-sm bg-white-blur   px-2 ">
              Username
            </label>
          </div>
          <button onClick={() => handleJoin()} className='w-1/4 self-end border-2 border-violet-300 text-gray-500 mr-4 rounded-lg h-10 hover:bg-violet-600 hover:text-white-1000'> Join </button>
        </Box>}
        {
          isJoined && <Fragment>
            <div className='w-full h-full flex'>
              <div className='w-full h-full'>
                <Header className='w-full h-14 bg-white-500 grid grid-cols-3 '>
                  <div className='flex'>
                    <h1 className='uppercase text-white-1000 font-bold text-4xl tracking-wider font-Rubik-Microbe self-start m-auto ml-4'>Meetin</h1>
                  </div>
                  <div></div>
                  <div className='flex'>
                    <select name="videoinput" onChange={(e) => {
                      if (producerLabel.has(mediaType.video)) {
                        closeProducer(mediaType.video)
                        // console.log('Producer already exists for this type ' + type)
                      }
                      produce(mediaType.video, e.target.value)
                      setSelectedVideoInput(e.target.value)
                    }} className="px-3 py-1.5 w-2/4 text-base font-normal text-gray-700 bg-white bg-clip-padding bg-no-repeat border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-purple-600 focus:outline-none">
                      {
                        inputDevices.map(device => {
                          if (device.kind === "videoinput") {
                            return (
                              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                            )
                          }
                        })
                      }
                    </select>
                    <select name="audioinput" onChange={(e) => setSelectedAudioInput(e.target.value)} className="px-3 py-1.5 w-2/4 text-base font-normal text-gray-700 bg-white bg-clip-padding bg-no-repeat border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-purple-600 focus:outline-none">
                      {
                        inputDevices.map(device => {
                          if (device.kind === "audioinput") {
                            return (
                              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                            )
                          }
                        })
                      }
                    </select>
                  </div>
                </Header>
                <div className='w-full h-[calc(100%-5.5rem)] '>
                  <div id='' className="w-11/12 h-[85%]  mt-[2%] grid gap-x-3 gap-y-3 m-auto justify-items-center sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    <video id="userLocalMediaEL" autoPlay className='w-11/12 h-11/12 xsm:w-64 xsm:h-56 object-cover shadow-[0px_0px_6px_5px_rgba(255,255,255,0.6)] rounded-2xl' src="" poster={posterImg}></video>
                    {
                      arr.map((_, i) => {
                        return (
                          <div id="">
                            <video key={i} onClick={() => setIsZoomed(`remoteLocalMediaEL${i}`)} id={`remoteLocalMediaEL${i}`} autoPlay className='w-64 h-56 object-cover shadow-[0px_0px_6px_5px_rgba(255,255,255,0.6)] rounded-2xl hidden xsm:block' src="" itemType="video/mp4" poster={posterImg} ></video>
                          </div>
                        )
                      })
                    }
                  </div>
                  <div className="h-[12%] grid place-items-center">
                    <div className="flex w-48 justify-between items-center">
                      {
                        producerDevices.includes(mediaType.screen) ?
                          <div className='w-10 h-10 rounded-xl bg-[rgb(0,0,0,0.7)]' onClick={() => closeProducer(mediaType.screen)}>
                            <span>SOP</span>
                          </div> :
                          <div className='w-10 h-10 rounded-xl bg-[rgb(0,0,0,0.7)]' onClick={() => produce(mediaType.screen)}>
                            <span>SRT</span>
                          </div>
                      }
                      {
                        producerDevices.includes(mediaType.video) ?
                          <div className='w-10 h-10 rounded-xl bg-[rgb(0,0,0,0.7)]' onClick={() => closeProducer(mediaType.video)}>
                            <span>VOP</span>
                          </div> :
                          <div className='w-10 h-10 rounded-xl bg-[rgb(0,0,0,0.7)]' onClick={() => produce(mediaType.video, selectedVideoInput)}>
                            <span>VRT</span>
                          </div>
                      }
                      <div className='w-12 h-12 rounded-xl bg-[rgb(255,0,0,0.7)]' onClick={() => exit()}>
                        <img src="https://img.icons8.com/ios-filled/50/000000/end-call.png" />
                      </div>
                      {
                        producerDevices.includes(mediaType.audio) ?
                          <div className='w-10 h-10 rounded-xl bg-[rgb(0,0,0,0.7)]' onClick={() => closeProducer(mediaType.audio)}>
                            <span>AOP</span>
                          </div> :
                          <div className='w-10 h-10 rounded-xl bg-[rgb(0,0,0,0.7)]' onClick={() => { console.log("selecteAudioInput : ", selectedAudioInput); produce(mediaType.audio, selectedAudioInput) }}>
                            <span>ART</span>
                          </div>
                      }
                    </div>
                  </div>
                  <div id='remoteAudio' className="">

                  </div>
                </div>
              </div>
              <div className='w-[30rem] hidden md:block h-screen bg-slate-100 '>
                <div className='flex justify-around align-middle h-12 mx-2 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]'>
                  <h3 className='font-mono font-semibold text-xl my-auto mr-3'>Group Chat</h3>
                  <h4 className='font-mono my-auto bg-gray-600 text-white-1000  rounded-md py-1 px-2 ' >Messages</h4>
                  <h4 className='font-mono my-auto  ' >Participants</h4>
                </div>
                <div className='h-[calc(100%-7rem)] w-full overflow-y-scroll' >
                  <h3 className='text-green-500'>This chat will only continue while you are participating.</h3>
                  {
                    chats?.map(chat => {
                      return (<ChatBubble chat={chat} socketId={socket.id}/>)
                    })
                  }
                  <div ref={messageBox}></div>
                </div>
                <div className='h-12'>
                  <input onKeyDown={(e) => e.key == "Enter" && sendChat()} type="tex relativet" value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder="Type something here..."
                    className="w-[90%] h-10 pl-1 text-sm rounded-md m-auto pb-0 text-gray-900 appearance-none peer focus:outline-none bg-slate-300"
                  ></input>
                </div>
              </div>
            </div>
          </Fragment>
        }
      </Container>
      <ToastContainer />
    </>
  )
}


const ChatBubble = ({ chat, socketId }: { chat: Chat, socketId : string }) => {

  if (chat.from === socketId) {
    return (
      <div className="flex mb-6 flex-row-reverse pr-3">
        <div className=' relative'>
          {/* <span className='text-xs w-12 truncate overflow-hidden inline-block absolute -top-4 right-12'>{chat.name}</span> */}
          <div className='flex '>
            <div className='bg-sky-200 rounded-t-2xl rounded-bl-2xl px-3 py-2 mr-2  '>
              {chat.message}
            </div>
            <div className='w-9 h-9 mt-auto rounded-full bg-slate-700'></div>

          </div>
          <span className='text-xs truncate overflow-hidden inline-block absolute -bottom-4 right-12'>{handleDate(chat.date)}</span>
        </div>
      </div>
    )
  } else {
    return (
      <div className="flex mb-6 pl-3">
        <div className=' relative'>
          {/* <span className='text-xs w-12 truncate overflow-hidden inline-block absolute -top-4 right-12'>{chat.name}</span> */}
          <div className='flex flex-row-reverse'>
            <div className='bg-slate-200 rounded-t-2xl rounded-br-2xl px-3 py-2 ml-2  '>
              {chat.message}
            </div>
            <div className='w-9 h-9 mt-auto rounded-full bg-slate-700'></div>
          </div>
          <span className='text-xs truncate overflow-hidden inline-block absolute -bottom-4 left-12'>{handleDate(chat.date)}</span>
        </div>
      </div>
    )
  }
}

const handleDate = (dateString: string) => {
  const date = new Date(dateString)
  return moment(date).fromNow();
}


const Header = styled.div`
`


const Title = styled.h1`
  background : radial-gradient(at 80% 0%, hsla(189,100%,56%,1) 0px, transparent 100%),
  radial-gradient(at 0% 50%, hsla(355,100%,93%,1) 0px, transparent 100%),
  radial-gradient(at 80% 50%, hsla(340,100%,76%,1) 0px, transparent 100%),
  radial-gradient(at 0% 100%, hsla(269,100%,77%,1) 0px, transparent 100%),
  radial-gradient(at 0% 0%, hsla(343,100%,76%,1) 0px, transparent 100%);
  -webkit-background-clip : text;
  -webkit-text-fill-color : transparent;
`

const Container = styled.div`
  width : 100vw;
  height : 100vh;
  display : grid;
  place-items : center;
  overflow: hidden;
  background-image:
radial-gradient(at 80% 0%, hsla(189,100%,56%,1) 0px, transparent 50%),
radial-gradient(at 0% 50%, hsla(355,100%,93%,1) 0px, transparent 50%),
radial-gradient(at 80% 50%, hsla(340,100%,76%,1) 0px, transparent 50%),
radial-gradient(at 0% 100%, hsla(269,100%,77%,1) 0px, transparent 50%),
radial-gradient(at 0% 0%, hsla(343,100%,76%,1) 0px, transparent 50%);
// background-image: linear-gradient(to right bottom, #333464, #402f5f, #4a2b58, #532651, #592148, #532247, #4e2245, #482243, #372543, #28263e, #1f2536, #1b232c);
// background: linear-gradient(90deg, hsla(0, 0%, 36%, 1) 0%, hsla(178, 44%, 32%, 1) 92%);
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


export default Lobby