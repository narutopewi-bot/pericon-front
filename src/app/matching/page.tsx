'use client'

import React, { use, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as fonts from '@/components/fonts'
import { useDispatch, useSelector } from 'react-redux'
import { setGamePlayer } from '@/store/slices/gameplayerSlice'
import { RootState } from '@/store/store'

import Image from 'next/image'
import LobbyUI from '@/components/lobby-ui'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import Swal from 'sweetalert2'
import 'sweetalert2/src/sweetalert2.scss'

function Dashboard() {
  const router = useRouter()
  const isRunning = useRef(false)

  // Get username from redux
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.gameplayer)
  console.log({ user })

  // Connext to game room and set username
  useEffect(() => {
    // Show error with sweetalert
    function showError(message: string) {
      Swal.fire({
        title: 'Error',
        text: message,
        icon: 'error',
        confirmButtonText: 'Ir a la pantalla de inicio',
      }).then((result: any) => {
        if (result.isConfirmed) {
          // Redirect to the match page with router
          const page = `/`
          router.push(page)
        }
      })
    }

    // Redirect to login page if user is not set
    if (!user.name && !user.id) {
      router.push('/iniciar-sesion')
      return
    }

    // Run only once
    if (isRunning.current) {
      return
    }

    // Connect to the websocket
    const WS_HOST = process.env.NEXT_PUBLIC_WS_HOST
    console.log('Connecting to the server: ', WS_HOST)
    const wsEndpoint = `${WS_HOST}/matchmaker/`
    const socket = new WebSocket(wsEndpoint)
    isRunning.current = true

    // Open connection
    socket.onopen = function (e) {
      // Show message when connection is open
      console.log('Connected to the server. Waiting for players...')
    }

    // Redirect to the match page when a room is created
    socket.onmessage = function (e) {
      const data = JSON.parse(e.data)
      const roomName = data['room_name']

      Swal.fire({
        title: 'Jugadores encontrados',
        text: 'Serás redirigido a la partida',
        icon: 'success',
        confirmButtonText: 'Ir a la partida',
      }).then((result: any) => {
        if (result.isConfirmed) {
          // Redirect to the match page with router
          const page = `/duelo/${roomName}/`
          router.push(page)
        }
      })
    }

    // Catch errors
    socket.onclose = function (e) {
      console.log('Connection closed.')
    }

    socket.onerror = function (e) {
      showError('No se pudo conectar al servidor. Intente de nuevo más tarde.')
    }

    socket.onclose = function (e) {
      showError(
        'Se ha perdido la conexión con el servidor. Intente de nuevo más tarde.'
      )
    }
  }, [])

  return (
    <React.Fragment>
      <div
        style={{ height: 'calc(90vh - 100px)' }}
        className='flex flex-wrap justify-center items-center'
      >
        <div className='flex flex-col items-center pb-2'>
          {/* Cuadrado 1 */}
          <div className='relative w-md h-auto pt-24 px-10 py-8 mb-[50px] backdrop-blur-xl bg-primary-200 rounded-[10px] border-secondary border-[3px] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary-100'>
            {/* Loading spinner */}
            <Image
              src='/spinner.svg'
              alt=''
              width={100}
              height={100}
              className='mt-[-130px]'
            />
            <div className='mt-5 flex justify-center'>
              <p
                className={`text-white text-[17px] xl:text-[22px] ${fonts.bowlbyOneSC.className}`}
              >
                Buscando jugadores
              </p>
            </div>
            <div className='flex justify-center items-center'>
              <p
                className={`text-white text-left text-[12px] xl:text-[16px] ${fonts.almarai.className} pr-[4px] text-center`}
              >
                Espere un momento mientras buscamos jugadores para una
                partida...
              </p>
            </div>
          </div>
        </div>
        <LobbyUI />
      </div>
    </React.Fragment>
  )
}

export default Dashboard
