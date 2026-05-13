import React, { useState, useEffect } from 'react';
import { GameConnection } from '../../lib/GameConnection';

export default function TicTacToe({ connection, isHost, myName, opponentName }: { connection: GameConnection, isHost: boolean, myName: string, opponentName: string }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [myTurn, setMyTurn] = useState<boolean>(isHost);
  const [winner, setWinner] = useState<string | null>(null);

  const mySymbol = isHost ? 'X' : 'O';

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        setWinner(squares[a]);
        return squares[a];
      }
    }
    if (!squares.includes(null)) {
      setWinner('Draw');
      return 'Draw';
    }
    return null;
  };

  useEffect(() => {
    const handleData = (data: any) => {
      if (data.type === 'MOVE') {
        setBoard(prev => {
          const newBoard = [...prev];
          newBoard[data.index] = isHost ? 'O' : 'X';
          checkWinner(newBoard);
          return newBoard;
        });
        setMyTurn(true);
      } else if (data.type === 'RESTART') {
        setBoard(Array(9).fill(null));
        setMyTurn(isHost);
        setWinner(null);
      }
    };
    connection.on('data', handleData);
    return () => {
      connection.off('data', handleData);
    };
  }, [connection, isHost]);

  const handleCellClick = (index: number) => {
    if (!myTurn || board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = mySymbol;
    setBoard(newBoard);
    setMyTurn(false);
    checkWinner(newBoard);

    connection.send({ type: 'MOVE', index });
  };

  const handleRestart = () => {
    setBoard(Array(9).fill(null));
    setMyTurn(isHost);
    setWinner(null);
    connection.send({ type: 'RESTART' });
  };

  const turnText = myTurn ? "Your Turn" : `${opponentName}'s Turn`;
  const winText = winner === 'Draw' ? "It's a Draw!" : `${winner === mySymbol ? 'You Win!' : `${opponentName} Wins!`}`;

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-serif mb-2">Tic-Tac-Toe</h2>
        <p className="text-sm uppercase tracking-widest opacity-60 font-bold">
          {winner ? winText : turnText}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 bg-black/10 p-2 rounded-xl">
        {board.map((cell, i) => (
          <div
            key={i}
            onClick={() => handleCellClick(i)}
            className={`w-24 h-24 bg-[#FAF9F6] flex items-center justify-center text-5xl font-serif text-text-primary cursor-pointer rounded-lg shadow-sm transition-colors ${!cell && myTurn && !winner ? 'hover:bg-black/5' : ''}`}
          >
            {cell}
          </div>
        ))}
      </div>
      {winner && (
        <button onClick={handleRestart} className="mt-8 px-6 py-2 bg-accent-primary text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">
          Play Again
        </button>
      )}
    </div>
  );
}
