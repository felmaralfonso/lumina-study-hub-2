import React, { useState, useEffect } from 'react';
import { GameConnection } from '../../lib/GameConnection';
import { cn } from '../../lib/utils';

export default function Connect4({ connection, isHost, myName, opponentName }: { connection: GameConnection, isHost: boolean, myName: string, opponentName: string }) {
  const ROWS = 6;
  const COLS = 7;
  
  const [board, setBoard] = useState<number[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
  const [myTurn, setMyTurn] = useState<boolean>(isHost);
  const [winner, setWinner] = useState<number | 'Draw' | null>(null);

  const myPlayerId = isHost ? 1 : 2;
  const oppPlayerId = isHost ? 2 : 1;

  const checkWinner = (currentBoard: number[][]) => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const player = currentBoard[r][c];
        if (player === 0) continue;
        
        if (c + 3 < COLS &&
            player === currentBoard[r][c+1] &&
            player === currentBoard[r][c+2] &&
            player === currentBoard[r][c+3]) return player;
            
        if (r + 3 < ROWS &&
            player === currentBoard[r+1][c] &&
            player === currentBoard[r+2][c] &&
            player === currentBoard[r+3][c]) return player;
            
        if (c + 3 < COLS && r + 3 < ROWS &&
            player === currentBoard[r+1][c+1] &&
            player === currentBoard[r+2][c+2] &&
            player === currentBoard[r+3][c+3]) return player;
            
        if (c - 3 >= 0 && r + 3 < ROWS &&
            player === currentBoard[r+1][c-1] &&
            player === currentBoard[r+2][c-2] &&
            player === currentBoard[r+3][c-3]) return player;
      }
    }
    
    if (currentBoard[0].every(cell => cell !== 0)) return 'Draw';
    return null;
  };

  useEffect(() => {
    const handleData = (data: any) => {
      if (data.type === 'MOVE') {
        const col = data.col;
        setBoard(prev => {
          const newBoard = prev.map(row => [...row]);
          for (let r = ROWS - 1; r >= 0; r--) {
            if (newBoard[r][col] === 0) {
              newBoard[r][col] = oppPlayerId;
              break;
            }
          }
          const w = checkWinner(newBoard);
          if (w) setWinner(w);
          return newBoard;
        });
        setMyTurn(true);
      } else if (data.type === 'RESTART') {
        setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
        setMyTurn(isHost);
        setWinner(null);
      }
    };
    connection.on('data', handleData);
    return () => {
      connection.off('data', handleData);
    };
  }, [connection, isHost, oppPlayerId]);

  const handleColClick = (col: number) => {
    if (!myTurn || winner) return;
    if (board[0][col] !== 0) return;

    const newBoard = board.map(row => [...row]);
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newBoard[r][col] === 0) {
        newBoard[r][col] = myPlayerId;
        break;
      }
    }
    
    setBoard(newBoard);
    setMyTurn(false);
    
    const w = checkWinner(newBoard);
    if (w) setWinner(w);

    connection.send({ type: 'MOVE', col });
  };

  const handleRestart = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
    setMyTurn(isHost);
    setWinner(null);
    connection.send({ type: 'RESTART' });
  };

  const turnText = myTurn ? "Your Turn" : `${opponentName}'s Turn`;
  const winText = winner === 'Draw' ? "It's a Draw!" : `${winner === myPlayerId ? 'You Win!' : `${opponentName} Wins!`}`;

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-serif mb-2">Connect 4</h2>
        <p className="text-sm uppercase tracking-widest opacity-60 font-bold">
          {winner ? winText : turnText}
        </p>
      </div>
      
      <div className="bg-[#1A1A1A] p-4 rounded-xl shadow-2xl inline-block">
        <div className="flex gap-2 mb-2">
           {Array(COLS).fill(null).map((_, col) => (
             <div 
               key={`target-${col}`}
               onClick={() => handleColClick(col)}
               className="w-12 h-12 flex items-center justify-center cursor-pointer group"
             >
                <div className={cn(
                  "w-4 h-4 rounded-full transition-opacity opacity-0 group-hover:opacity-100",
                  myPlayerId === 1 ? "bg-red-500" : "bg-yellow-400"
                )} />
             </div>
           ))}
        </div>
        <div className="grid grid-rows-6 gap-2">
          {board.map((row, r) => (
            <div key={`row-${r}`} className="flex gap-2">
              {row.map((cell, c) => (
                <div 
                  key={`cell-${r}-${c}`}
                  onClick={() => handleColClick(c)}
                  className="w-12 h-12 bg-[#333333] rounded-full overflow-hidden p-1 shadow-inner cursor-pointer"
                >
                  <div className={cn(
                    "w-full h-full rounded-full transition-colors",
                    cell === 0 ? "bg-[#1A1A1A]" : cell === 1 ? "bg-red-500 shadow-[inset_0_-2px_10px_rgba(0,0,0,0.5)]" : "bg-yellow-400 shadow-[inset_0_-2px_10px_rgba(0,0,0,0.5)]"
                  )} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {winner && (
        <button onClick={handleRestart} className="mt-8 px-6 py-2 bg-accent-primary text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">
          Play Again
        </button>
      )}
    </div>
  );
}
