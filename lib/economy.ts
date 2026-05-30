export async function getUserBalance(playerName: string): Promise<number> {
  // In a real application, this would fetch from a 'users' table in Supabase
  // based on an authenticated user ID. For now, we mock a starting balance.
  return 1500;
}

export async function deductCoins(playerName: string, amount: number): Promise<boolean> {
  // In a real application, this would run a secure SQL transaction to decrement
  // the user's balance and increment the room pot.
  console.log(`Deducted ${amount} from ${playerName}`);
  return true;
}

export async function awardCoins(playerName: string, amount: number): Promise<boolean> {
  console.log(`Awarded ${amount} to ${playerName}`);
  return true;
}
