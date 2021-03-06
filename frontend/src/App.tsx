import React, { useState } from "react";
import "./App.css";
import {
  BoardPosition,
  GameState,
  boardIdToPosition,
  Piece,
  INITIAL_GAME_STATE,
  calculateNextGamestate,
} from "./game";

const BOARD_POSITIONS = Array(8)
  .fill({})
  .map((_, x) =>
    Array(8)
      .fill({})
      .map((_, y) => `${x}${y}`)
  )
  .flat()
  .map(boardIdToPosition);

const isOdd = (x: number) => !!(x % 2);

const boardPositionToCssPosition = (boardPosition: BoardPosition) => ({
  left: `${(boardPosition.value()[0] / 8) * 100}%`,
  top: `${(boardPosition.value()[1] / 8) * 100}%`,
});

const BoardPiece: React.FC<
  Piece & {
    boardPositionId: string;
    active: boolean;
    onClick: () => void;
    clickable: boolean;
  }
> = ({ type, side, boardPositionId, active, onClick, clickable }) => {
  const boardPosition = boardIdToPosition(boardPositionId);
  return (
    <div
      className={`Board-piece ${active ? "active" : ""}`}
      style={{
        ...boardPositionToCssPosition(boardPosition),
        pointerEvents: clickable ? "all" : "none",
      }}
      onClick={() => onClick()}
    >
      <i className={`fas fa-3x fa-chess-${type} ${side}-piece`}></i>
    </div>
  );
};

const BoardSquare: React.FC<{
  boardPosition: BoardPosition;
  onClick: (boardPosition: BoardPosition) => void;
}> = ({ boardPosition, onClick }) => (
  <div
    className={`Board-square ${
      isOdd(boardPosition.value()[0] + boardPosition.value()[1])
        ? "black"
        : "white"
    }`}
    onClick={() => onClick(boardPosition)}
    style={boardPositionToCssPosition(boardPosition)}
  ></div>
);

const X_MARKINGS = ["x", ["A", "B", "C", "D", "E", "F", "G", "H"]] as [
  string,
  string[]
];
const Y_MARKINGS = ["y", ["8", "7", "6", "5", "4", "3", "2", "1"]] as [
  string,
  string[]
];

const Board: React.FC = () => {
  const [activePiece, setActivePiece] = useState<string | null>(null);
  const [currentGameState, setCurrentGameState] = useState<GameState>(
    INITIAL_GAME_STATE
  );

  const onPieceClick = (piece: Piece, boardPositionId: string) =>
    currentGameState.turn === piece.side
      ? setActivePiece(boardPositionId)
      : null;

  const onBoardSquareClick = (boardPosition: BoardPosition) => {
    const activePieceData = activePiece
      ? currentGameState.boardState[activePiece]
      : null;
    if (activePieceData) {
      const nextGameState = calculateNextGamestate(
        {
          ...activePieceData,
          boardPosition: boardIdToPosition(activePiece!),
        },
        currentGameState,
        boardPosition
      );
      setCurrentGameState(nextGameState);
      if (nextGameState.winner) {
        alert(`Game over! Winner: ${nextGameState.winner}`);
      } else if (nextGameState.check) {
        alert("Check");
      }
      setActivePiece(null);
    }
  };

  return (
    <div className="Board-wrap">
      {[X_MARKINGS, Y_MARKINGS].map(([axis, marks]) => (
        <div className={`Board-edge Board-edge--${axis}`} key={axis}>
          {marks.map((mark) => (
            <div className="Board-edge-item" key={mark}>
              {mark}
            </div>
          ))}
        </div>
      ))}
      <div className="Board">
        {BOARD_POSITIONS.map((boardPosition) => (
          <BoardSquare
            key={boardPosition.toId()}
            boardPosition={boardPosition}
            onClick={onBoardSquareClick}
          />
        ))}
        {Object.keys(currentGameState.boardState).map((boardPositionId) => {
          const piece = currentGameState.boardState[boardPositionId];
          return piece ? (
            <BoardPiece
              key={boardPositionId}
              active={boardPositionId === activePiece}
              clickable={currentGameState.turn === piece.side}
              onClick={() => onPieceClick(piece, boardPositionId)}
              boardPositionId={boardPositionId}
              {...piece}
            />
          ) : null;
        })}
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Chess</h1>
      </header>
      <main>
        <Board />
      </main>
    </div>
  );
}

export default App;
