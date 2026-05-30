import { supabase } from './supabase';

export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type CardValue = 
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' 
  | 'skip' | 'reverse' | 'draw_2' | 'wild' | 'wild_draw_4';

export interface Card {
  id: string; // Unique ID for animations and keys
  color: CardColor;
  value: CardValue;
}

export interface Player {
  name: string;
  hand: Card[];
  coins?: number; // Advanced Feature: Betting system
  isBot?: boolean; // Advanced Feature: AI Bot integration
  avatar?: string; // Fixed: Added for avatar UI
}

export interface RoomData {
  id: string;
  status: 'waiting' | 'playing';
  players: Player[];
  current_turn: string;
  direction: 1 | -1;
  discard_pile: Card[];
  deck: Card[];
  pot?: number; 
  turn_started_at?: string; 
  entry_bet?: number; 
  max_players?: number; // ⭐️ FIXED: This is what crashed Vercel!
}

/**
 * Generates a standard 108-card UNO deck.
 */
export function generateDeck(): Card[] {
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  const deck: Card[] = [];
  let idCounter = 0;

  for (const color of colors) {
    // One 0 card per color
    deck.push({ id: `card-${idCounter++}`, color, value: '0' });

    // Two of each 1-9 per color
    for (let i = 1; i <= 9; i++) {
      const valStr = i.toString() as CardValue;
      deck.push({ id: `card-${idCounter++}`, color, value: valStr });
      deck.push({ id: `card-${idCounter++}`, color, value: valStr });
    }

    // Two of each action card per color
    const actions: CardValue[] = ['skip', 'reverse', 'draw_2'];
    for (const action of actions) {
      deck.push({ id: `card-${idCounter++}`, color, value: action });
      deck.push({ id: `card-${idCounter++}`, color, value: action });
    }
  }

  // Four Wild and Four Wild Draw 4 cards
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card-${idCounter++}`, color: 'wild', value: 'wild' });
    deck.push({ id: `card-${idCounter++}`, color: 'wild', value: 'wild_draw_4' });
  }

  return deck;
}

/**
 * Shuffles a given deck of cards using Fisher-Yates algorithm.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

/**
 * Starts the game by dealing cards, setting the first card, and updating the room in Supabase.
 */
export async function startGame(roomId: string, players: Player[]) {
  const deck = shuffleDeck(generateDeck());
  const updatedPlayers = players.map(p => ({ ...p, hand: [] as Card[] }));

  // Deal 7 cards to each player
  for (let i = 0; i < 7; i++) {
    for (const player of updatedPlayers) {
      const card = deck.pop();
      if (card) player.hand.push(card);
    }
  }

  // Pop 1 valid starting card into discard pile
  // Standard rules: If first card is Wild Draw 4, put it back and draw another.
  let startingCard = deck.pop()!;
  while (startingCard.value === 'wild_draw_4') {
    // Put it back at the bottom of the deck
    deck.unshift(startingCard);
    startingCard = deck.pop()!;
  }
  const discardPile = [startingCard];

  // Randomly select a player for current_turn
  const startingPlayerIndex = Math.floor(Math.random() * updatedPlayers.length);
  const currentTurn = updatedPlayers[startingPlayerIndex].name;

  // Update Supabase
  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'playing',
      players: updatedPlayers,
      current_turn: currentTurn,
      direction: 1,
      discard_pile: discardPile,
      deck: deck,
      pot: 0,
      turn_started_at: new Date().toISOString()
    })
    .eq('id', roomId);

  if (error) {
    console.error('Error starting game:', error);
    throw error;
  }
}

/**
 * Checks if a card is legally playable on top of another card.
 */
export function isPlayable(card: Card, topCard: Card): boolean {
  if (card.color === 'wild') return true;
  if (card.color === topCard.color) return true;
  if (card.value === topCard.value) return true;
  return false;
}

/**
 * Gets the next player's name based on current direction and potentially skipping.
 */
function getNextTurn(players: Player[], currentTurn: string, direction: 1 | -1, skipCount: number = 0): string {
  const currentIndex = players.findIndex(p => p.name === currentTurn);
  const numPlayers = players.length;
  // Calculate next index, handling negative modulo correctly in JS
  let nextIndex = (currentIndex + (direction * (1 + skipCount))) % numPlayers;
  if (nextIndex < 0) nextIndex += numPlayers;
  return players[nextIndex].name;
}

/**
 * Handles playing a card. Validates the move, updates hands, handles special card logic, and updates Supabase.
 * Optional `chosenColor` is for when a user plays a wild card.
 */
export async function playCard(roomId: string, roomData: RoomData, playerName: string, cardId: string, chosenColor?: CardColor) {
  if (roomData.current_turn !== playerName) throw new Error("Not your turn!");

  const player = roomData.players.find(p => p.name === playerName);
  if (!player) throw new Error("Player not found");

  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) throw new Error("Card not found in hand");
  const card = player.hand[cardIndex];

  const topCard = roomData.discard_pile[roomData.discard_pile.length - 1];

  if (!isPlayable(card, topCard)) {
     throw new Error("Invalid move");
  }

  // Remove card from hand
  const newHand = [...player.hand];
  newHand.splice(cardIndex, 1);
  
  // Clone players to update
  let updatedPlayers = roomData.players.map(p => 
    p.name === playerName ? { ...p, hand: newHand } : { ...p, hand: [...p.hand] }
  );

  let newDirection = roomData.direction;
  let skipNext = 0;
  let drawAmount = 0;

  // Add played card to discard pile. Apply chosenColor if wild.
  const playedCardForDiscard = { ...card };
  if (card.color === 'wild' && chosenColor) {
     playedCardForDiscard.color = chosenColor;
  }
  const newDiscardPile = [...roomData.discard_pile, playedCardForDiscard];
  let newDeck = [...roomData.deck];

  // Handle special card effects
  if (card.value === 'reverse') {
    newDirection = (newDirection * -1) as 1 | -1;
    // In a 2-player game, reverse acts as a skip
    if (updatedPlayers.length === 2) {
        skipNext = 1;
    }
  } else if (card.value === 'skip') {
    skipNext = 1;
  } else if (card.value === 'draw_2') {
    drawAmount = 2;
    skipNext = 1;
  } else if (card.value === 'wild_draw_4') {
    drawAmount = 4;
    skipNext = 1;
  }

  const nextTurn = getNextTurn(updatedPlayers, playerName, newDirection, skipNext);

  // Handle Drawing Cards for the next player
  if (drawAmount > 0) {
    const nextPlayerIndex = updatedPlayers.findIndex(p => p.name === getNextTurn(updatedPlayers, playerName, newDirection, 0));
    
    for(let i=0; i<drawAmount; i++) {
        if (newDeck.length === 0) {
            // Reshuffle discard pile into deck if deck is empty (leave top card)
            const top = newDiscardPile.pop()!;
            newDeck = shuffleDeck(newDiscardPile.map(c => c.color === 'wild' ? { ...c, color: 'wild' } : c)); // Reset wild colors
            newDiscardPile.length = 0;
            newDiscardPile.push(top);
        }
        if (newDeck.length > 0) {
            updatedPlayers[nextPlayerIndex].hand.push(newDeck.pop()!);
        }
    }
  }

  const { error } = await supabase
    .from('rooms')
    .update({
      players: updatedPlayers,
      current_turn: nextTurn,
      direction: newDirection,
      discard_pile: newDiscardPile,
      deck: newDeck,
      turn_started_at: new Date().toISOString()
    })
    .eq('id', roomId);

  if (error) throw error;
}

/**
 * Handles drawing a single card from the deck when a user has no playable cards (or chooses to draw).
 */
export async function drawCard(roomId: string, roomData: RoomData, playerName: string) {
  if (roomData.current_turn !== playerName) throw new Error("Not your turn!");

  const playerIndex = roomData.players.findIndex(p => p.name === playerName);
  if (playerIndex === -1) throw new Error("Player not found");

  let newDeck = [...roomData.deck];
  const newDiscardPile = [...roomData.discard_pile];
  let updatedPlayers = roomData.players.map(p => ({ ...p, hand: [...p.hand] }));

  if (newDeck.length === 0) {
      const top = newDiscardPile.pop()!;
      newDeck = shuffleDeck(newDiscardPile.map(c => c.color === 'wild' ? { ...c, color: 'wild' } : c));
      newDiscardPile.length = 0;
      newDiscardPile.push(top);
  }

  const drawnCard = newDeck.pop();
  if (drawnCard) {
      updatedPlayers[playerIndex].hand.push(drawnCard);
  }

  const nextTurn = getNextTurn(updatedPlayers, playerName, roomData.direction);

  const { error } = await supabase
    .from('rooms')
    .update({
      players: updatedPlayers,
      current_turn: nextTurn,
      deck: newDeck,
      discard_pile: newDiscardPile,
      turn_started_at: new Date().toISOString()
    })
    .eq('id', roomId);

  if (error) throw error;
}