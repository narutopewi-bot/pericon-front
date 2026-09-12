'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMediaQuery } from '@/components/use-media-query'
import { RootState, useAppSelector } from '@/store/store'
import { useParams } from 'next/navigation'

import Image from 'next/image'
import Timer from '@/components/timer'
import Stone from '@/components/stone-meter'
import Link from 'next/link'

import Swal from 'sweetalert2'
import 'sweetalert2/src/sweetalert2.scss'

// Types
interface Card {
  suit: string
  number: number
  image: string
}

interface Oponent {
  username: string
  avatar: string
}

interface GameCard {
  image: any
}

export default function Duel() {
  // Router
  const router = useRouter()

  // Get roomName from the URL
  const { roomName } = useParams()

  // Game state
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [matchSocket, setMatchSocket] = useState<WebSocket | null>(null)
  const [showOverlay, setShowOverlay] = React.useState(false)
  const [textOverlay, setTextOverlay] = React.useState('Sample text overlay')
  const [ctaTextOverlay, setCtaTextOverlay] = React.useState('CTA')
  const [ctaLinkOverlay, setCtaLinkOverlay] = React.useState('/')
  const [imageOverlay, setImageOverlay] = React.useState('')
  const [points, setPoints] = React.useState<number>(0)
  const [selectedCard, setSelectedCard] = React.useState<GameCard | null>(null)
  const [waitingOpponent, setWaitingOpponent] = React.useState(true)

  // Players
  const user = useAppSelector((state: RootState) => state.gameplayer)
  const userName = (user as any)?.name || (user as any)?.username || 'Jugador'
  const [oponent, setOponent] = React.useState<Oponent>({
    username: '',
    avatar: '',
  })

  // Cards
  const [tableCards, setTableCards] = React.useState<Card[]>([])
  const [playerCards, setPlayerCards] = React.useState<Card[]>([])
  const [oponentCards, setOponentCards] = React.useState<number>(0)

  // Styles for cards
  const playerCardStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'transform rotate-[-10deg] mt-[-4px] hover:mt-[-8px]'
      case 1:
        return 'transform rotate-[-0deg] mx-[10px] mt-[-10px] hover:mt-[-14px] '
      case 2:
        return 'transform rotate-[10deg] mt-[-4px] hover:mt-[-8px]'
      default:
        return ''
    }
  }

  const oponentCardStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'transform rotate-[-10deg] mt-[-4px]'
      case 1:
        return 'transform rotate-[-0deg] mx-[10px] mt-[-10px]'
      case 2:
        return 'transform rotate-[10deg] mt-[-4px]'
      default:
        return ''
    }
  }

  // Event handlers

  const handleCardClick = (card: Card) => {

    // Set selected card
    setSelectedCard(card)

    // Submit card to ws when clicked
    const cardStr = `${card.number} ${card.suit}`
    if (matchSocket) {
      matchSocket.send(
        JSON.stringify({
          type: 'use card',
          value: cardStr,
        })
      )
    }

    // Activate waiting overlay
    setWaitingOpponent(true)
  }

  // Lifecycle

  useEffect(() => {
    // dummy initial data
    setOponent({ username: 'Oponente', avatar: '/avatar.png' })
  }, [])

  useEffect(() => {
    // Setup WS when roomName is available
    if (roomName) {
      const WS_HOST = process.env.NEXT_PUBLIC_WS_HOST
      const wsEndpoint = `${WS_HOST}/match/${roomName}/`
      const newSocket = new WebSocket(wsEndpoint)
      setMatchSocket(newSocket)
    }
  }, [roomName])

  useEffect(() => {
    // Websocket setup

    // Get card data fvrom text like: '1 hearts'
    function getCardData(card: string): Card {
      const cardParts = card.split(' ')
      const cardNumber = parseInt(cardParts[0])
      const cardSuit = cardParts[1]
      const cardImage = `/cards/${cardNumber}_${cardSuit}.png`
      return { suit: cardSuit, number: cardNumber, image: cardImage }
    }

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

    function showWinner(winner: string, winnerTypePrefix: string, winnerType: string) {
      let mainText = `¡Ganaste ${winnerTypePrefix} ${winnerType}!`
      if (winner === 'draw') {
        mainText = '¡Empate!'
      } else if (winner !== userName) {
        mainText = `¡Perdiste ${winnerTypePrefix} ${winnerType}!`
      }

      Swal.fire({
        title: mainText,
        icon: winner === userName ? 'success' : 'warning',
        confirmButtonText: `Siguiente ${winnerType}`,
      }).then((result: any) => {

        // Request more cards if user has 0 cards
        setPlayerCards((prev) => {
          if (prev.length === 0) {
            matchSocket &&
              matchSocket.send(
                JSON.stringify({
                  type: 'more cards',
                  value: '',
                })
              )
            return []
          }
          return prev
        })

        // Remove other cards from table and only keep middle card
        setTableCards((prev) => {
          const middleCard = prev[0]
          console.log({ middleCard, prev })
          return [middleCard]
        })
      })
    }

    // send username to the server after connection is open
    if (matchSocket) {
      matchSocket.onopen = function (e) {
        // Send username only once
        matchSocket.send(
          JSON.stringify({
            type: 'username',
            value: userName,
          })
        )
      }

      // Get messages from the server
      matchSocket.onmessage = function (e) {
        const data = JSON.parse(e.data)

        if (data.type === 'usernames') {
          // Set oponent username
          const usernames = data.value
          for (const username of usernames) {
            if (username !== userName) {
              setOponent({ username, avatar: '/avatar.png' })
            }
          }
        } else if (data.type === 'round cards') {
          // Reset player cards
          setPlayerCards([])

          // render user cards
          const roundCards = data.value
          for (const card of roundCards) {
            const cardData = getCardData(card)
            setPlayerCards((prev) => [
              ...prev,
              {
                suit: cardData.suit,
                number: cardData.number,
                image: cardData.image,
              },
            ])
          }
        } else if (data.type === 'middle card') {

          // Update table cards
          const middleCard = data.value
          if (middleCard === '') {
            setTableCards([])
            return
          }
          const cardData = getCardData(middleCard)
          setTableCards((prev) => [
            {
              suit: cardData.suit,
              number: cardData.number,
              image: cardData.image,
            },
          ])

          // Hide waiting overlay
          setWaitingOpponent(false)

        } else if (data.type === 'error') {
          // Render errores with sweetalert
          showError(data.value)
        } else if (data.type === 'turn played cards') {
          for (const cardItem of data.value) {
            const player = cardItem.player
            const card = cardItem.card

            // Render cards in board
            const cardData = getCardData(card)
            setTableCards((prev) => [
              ...prev,
              {
                suit: cardData.suit,
                number: cardData.number,
                image: cardData.image,
              },
            ])

            if (player === userName) {
              // Remove card from player
              setPlayerCards((prevPlayerCards) => {
                // Filter out the card to be removed
                const newPlayerCards = prevPlayerCards.filter(
                  (playerCard) => playerCard.image !== cardData.image
                )
                return newPlayerCards
              })
            }

            // Disable waiting overlay
            setWaitingOpponent(false)
          }
        } else if (data.type.includes('winner')) {
          setTimeout(() => {
            // reset selected card
            setSelectedCard(null)

            // Show winner with alert
            if (data.type === 'round winner') {
              showWinner(data.value, 'la', 'ronda')
            } else if (data.type === 'turn winner') {
              showWinner(data.value, 'el', 'turno')
            } else if (data.type === 'game winner') {
              // Show winner in modal
              setImageOverlay('/win.svg')
              if (data.value !== userName) {
                setImageOverlay('/lose.svg')
              }
              setTextOverlay("¡Fin del juego!")
              setCtaTextOverlay('Volver a jugar')
              setCtaLinkOverlay('/matching')
              setShowOverlay(true)
            }

            // Hide waiting overlay
            setWaitingOpponent(false)
          }, 1500)
        } else if (data.type === 'points') {
          // Update player points
          for (const pointsData of data.value) {
            if (pointsData.player === userName) {
              setPoints(pointsData.points)
            }
          }
        }
      }

      matchSocket.onclose = function (e) {
        showError('Se perdió la conexión con el servidor')
      }
    }
  }, [matchSocket])

  useEffect(() => {
    if (waitingOpponent) {
      // Set overlay text and disable CTAs
      setTextOverlay('Esperando al oponente...')
      setCtaTextOverlay('')
      setCtaLinkOverlay('')
      setShowOverlay(true)
    } else {
      setShowOverlay(false)
    }
  }, [waitingOpponent])

  useEffect(() => {
    setOponentCards(playerCards.length)
  }, [playerCards])

  // Monitoring
  useEffect(() => {
    console.log({ playerCards, tableCards })
  }, [playerCards, tableCards])

  return (
    <main className='grid h-screen overflow-auto space-y-0'>
      <div className='bg-goat absolute inset-0 z-0'></div>
      <div className='flex flex-col h-screen relative'>
        {/* UI content */}
        <div className='relative z-10'>
          <div className='flex justify-between w-full mt-5'>
            <div className='mt-[5px] mb-4'>
              <Timer start={30} isRunning={true} />
            </div>
            <div>
              <Stone stoneone={points} stonetwo={0} />
            </div>
          </div>
          {/* Dynamic content */}
          <div className='flex items-center justify-center h-full'>
            <div className='relative'>
              {showOverlay && (
                <div className='fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 flex-col'>
                  <div className='text-white text-2xl'>{textOverlay}</div>
                  {
                    imageOverlay
                    &&
                    <Image
                      src={imageOverlay}
                      alt='overlay'
                      width={300}
                      height={300}
                      className={`
                        w-10/12
                        max-w-xl
                        h-auto
                      `}
                    />
                  }
                  {ctaLinkOverlay && ctaTextOverlay && (
                    <Link
                      href={ctaLinkOverlay}
                      className={`
                        text-black
                        bg-yellow
                        my-4 
                        px-6
                        py-2
                        text-lg 
                        opacity-100 hover:opacity-80
                        scale-100 hover:scale-95
                        duration-150
                        rounded-xl
                        font-bold
                      `}
                    >
                      {ctaTextOverlay}
                    </Link>
                  )}
                </div>
              )}
              {/* Área de la Mesa */}
              <div
                className='flex justify-center items-center w-full fixed top-[130px] left-0'
                style={{ height: 'calc(100vh - 220px)' }}
              >
                <div
                  className={`${
                    isDesktop ? 'bg-table' : 'bg-tablev'
                  } w-full h-full`}
                />
              </div>

              {/* Contenido sobre la Mesa */}
              <div
                className='z-10 relative text-white flex flex-col justify-between h-full'
                style={{ height: 'calc(100vh - 160px)' }}
              >
                {/* Oponente */}
                <div className='flex justify-center'>
                  <div>
                    <div className='mt-[-40px]'>
                      <div className='relative w-[100px] h-[90px] mt-8 flex justify-center items-center'>
                        <div className='absolute inset-0 bg-white z-0 w-[82px] h-[90px] ml-[10px]' />
                        <Image
                          src={oponent.avatar}
                          alt='avatar'
                          width={70}
                          height={70}
                          className='absolute z-10'
                        />
                        <div className='absolute z-20'>
                          <Image
                            src='/overlay.png'
                            alt='overlay'
                            width={120}
                            height={120}
                          />
                        </div>
                      </div>
                      <div className='text-center text-white truncate max-w-[100px]'>
                        @{oponent.username}
                      </div>
                    </div>
                  </div>

                  <div className='flex flex-row ml-3'>
                    {Array.from({ length: oponentCards }, (_, index) => (
                      <div
                        key={index}
                        className={`${oponentCardStyle(index)}`}
                      >
                        <Image
                          src='/card_back.png'
                          alt={`Carta ${index + 1}`}
                          width={70}
                          height={70}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Elemento Central */}
                <div className='flex justify-center'>
                  <div>
                    {/* <div className='text-center text-white'>
                <div className='flex flex-row'>
                  <div>
                    <Image
                      src='/card_back.png'
                      width={60}
                      height={60}
                      alt=''
                    />
                  </div>
                </div>
              </div> */}

                    {/*table cards*/}
                    <div className='flex flex-row'>
                      {tableCards &&
                        tableCards.map((card: any, index: any) => (
                          <div key={index}>
                            <Image
                              src={card.image}
                              alt=''
                              width={60}
                              height={70}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Player */}
                <div className='flex justify-center mb-4'>
                  <div>
                    <div className=''>
                      <div className='relative w-[100px] h-[90px] flex justify-center items-center'>
                        <div className='absolute inset-0 bg-white z-0 w-[82px] h-[90px] ml-[10px]' />
                        <Image
                          src={'/avatar.png'}
                          alt='avatar'
                          width={70}
                          height={70}
                          className='absolute z-10'
                        />
                        <div className='absolute z-20'>
                          <Image
                            src='/overlay.png'
                            alt='overlay'
                            width={120}
                            height={120}
                          />
                        </div>
                      </div>
                      <div className='text-center text-white truncate max-w-[100px]'>
                        @{userName}
                      </div>
                    </div>
                  </div>

                  <div className='flex flex-row ml-3'>
                    {playerCards &&
                      playerCards.map((card, index) => (
                        <div
                          key={index}
                          className={`
                            ${playerCardStyle(index)} cursor-pointer
                            duration-150
                            ${
                              selectedCard?.image === card.image && `opacity-50`
                            }
                          `}
                          onClick={
                            () => {
                              if (
                                tableCards.length > 0 &&
                                tableCards.length < 3
                              ) {
                                handleCardClick(card)
                              }
                            } // Añadido onClick para manejar el clic en la carta
                          }
                        >
                          <Image
                            src={card.image}
                            width={70}
                            height={70}
                            alt={`Carta ${index + 1}`}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
