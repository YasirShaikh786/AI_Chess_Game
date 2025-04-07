import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import axios from 'axios';

function App() {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState('white');
  const [difficulty, setDifficulty] = useState('medium');
  const [gameStatus, setGameStatus] = useState('Game in progress');
  const [turn, setTurn] = useState('white');

  const startNewGame = async () => {
    try {
      const response = await axios.post('http://localhost:5000/reset', {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const newGame = new Chess(response.data.fen);
      setGame(newGame);
      updateGameInfo(newGame);
    } catch (error) {
      console.error('Error starting new game:', error);
      setGameStatus('Failed to start new game');
    }
  };

  const makeMove = async (move) => {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      if (!result) return false;

      const response = await axios.post('http://localhost:5000/make_move', {
        move: result.san,
      });

      const updatedGame = new Chess(response.data.fen);
      setGame(updatedGame);
      updateGameInfo(updatedGame);

      if (!updatedGame.isGameOver() && updatedGame.turn() !== playerColor[0]) {
        setTimeout(makeAIMove, 500);
      }

      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  };

  const makeAIMove = async () => {
    if (game.isGameOver()) return;
    try {
      const response = await axios.post('http://localhost:5000/ai_move', {
        difficulty,
      });

      const updatedGame = new Chess(response.data.fen);
      setGame(updatedGame);
      updateGameInfo(updatedGame);
    } catch (error) {
      console.error('Error making AI move:', error);
    }
  };

  const updateGameInfo = (chessInstance) => {
    setTurn(chessInstance.turn() === 'w' ? 'white' : 'black');

    if (chessInstance.isCheckmate()) {
      setGameStatus(`Checkmate! ${chessInstance.turn() === 'w' ? 'Black' : 'White'} wins!`);
    } else if (chessInstance.isDraw()) {
      setGameStatus('Game ended in draw!');
    } else if (chessInstance.isCheck()) {
      setGameStatus('Check!');
    } else {
      setGameStatus('Game in progress');
    }
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if ((playerColor === 'white' && game.turn() !== 'w') || 
        (playerColor === 'black' && game.turn() !== 'b')) {
      return false;
    }

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    };

    return makeMove(move);
  };

  useEffect(() => {
    startNewGame();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-center">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">♟️ AI-Powered Chess Game</h1>

      <div className="bg-white shadow-lg rounded-xl p-4 max-w-4xl mx-auto mb-6">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-4 py-2 rounded border border-gray-300 shadow-sm"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <button
            onClick={startNewGame}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow"
          >
            🔁 New Game
          </button>

          <button
            onClick={makeAIMove}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded shadow"
          >
            🤖 Let AI Move
          </button>

          <div className="flex items-center gap-4 ml-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="playerColor"
                value="white"
                checked={playerColor === 'white'}
                onChange={() => setPlayerColor('white')}
                className="mr-2"
              />
              Play as White
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="playerColor"
                value="black"
                checked={playerColor === 'black'}
                onChange={() => setPlayerColor('black')}
                className="mr-2"
              />
              Play as Black
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto shadow-xl rounded-xl p-4 bg-white">
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardOrientation={playerColor}
          customBoardStyle={{
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)'
          }}
        />
      </div>

      <div className="bg-white shadow-md rounded-xl p-4 max-w-3xl mx-auto mt-6">
        <p className="text-lg text-gray-800">
          <strong>Status:</strong> {gameStatus}
        </p>
        <p className="text-md text-gray-600">
          <strong>Current turn:</strong> {turn}
        </p>
      </div>
    </div>
  );
}

export default App;
