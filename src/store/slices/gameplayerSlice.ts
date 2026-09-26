import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/* export interface IUserState {
  id?: string;
  username?: string;
  email?: string;
  avatar?: string;
  level?: string;
  exp?: number;
  credits?: number;
} */

export interface GamePlayer {
  id: string;
  name: string;
  email: string;
  coins: number;
  bonusCoins?: number;
  retirableCoins?: number;
  active: boolean;
  wins?: number;
  losses?: number;
  level?: string;
  avatarUrl?: string;
}

const initialState: GamePlayer = {
  id: "",
  name: "",
  email: "",
  coins: 200,
  bonusCoins: 200,
  retirableCoins: 0,
  active: false,
  wins: 0,
  losses: 0,
  level: "Peón de Casona",
  avatarUrl: "",
};

export const gameplayerSlice = createSlice({
  name: "gameplayer",
  initialState,
  reducers: {
    setGamePlayer: (
      state: GamePlayer,
      action: PayloadAction<Partial<GamePlayer>>,
    ): GamePlayer => {
      return { ...state, ...action.payload };
    },
    clearGamePlayer: (_: GamePlayer): GamePlayer => {
      return { ...initialState };
    },
  },
});

export const { setGamePlayer, clearGamePlayer } = gameplayerSlice.actions;
export const gameplayerReducer = gameplayerSlice.reducer;
