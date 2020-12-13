import React, { useState } from "react";
import "./App.css";
import {
  BoardPosition,
  GameState,
  flatten,
  boardIdToPosition,
  boardPositionToId,
  Piece,
  INITIAL_GAME_STATE,
  Move,
  PIECE_MOVE_CHECKS,
  PieceData,
  moveIsAllowed,
  getAllowedMoves,
} from "./game";

const BOARD_POSITIONS = flatten(
  Array(8)
    .fill({})
    .map((_, x) =>
      Array(8)
        .fill({})
        .map((_, y) => `${x}${y}`)
    )
).map(boardIdToPosition);

const isOdd = (x: number) => !!(x % 2);

const boardPositionToCssPosition = (boardPosition: BoardPosition) => ({
  left: `${(boardPosition[0] / 8) * 100}%`,
  top: `${(boardPosition[1] / 8) * 100}%`,
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
      isOdd(boardPosition[0] + boardPosition[1]) ? "black" : "white"
    }`}
    onClick={() => onClick(boardPosition)}
    style={boardPositionToCssPosition(boardPosition)}
  >
    {boardPositionToId(boardPosition)}
  </div>
);

const Board: React.FC = () => {
  const [activePiece, setActivePiece] = useState<string | null>(null);
  const [currentGameState, setCurrentGameState] = useState<GameState>(
    INITIAL_GAME_STATE
  );
  return (
    <div className="Board-wrap">
      <div className="Board">
        {BOARD_POSITIONS.map((boardPosition) => (
          <BoardSquare
            key={boardPositionToId(boardPosition)}
            boardPosition={boardPosition}
            onClick={(boardPosition: BoardPosition) => {
              const activePieceData = activePiece
                ? currentGameState.boardState[activePiece]
                : null;
              if (
                activePieceData &&
                moveIsAllowed(
                  {
                    type: activePieceData.type,
                    boardPosition: boardIdToPosition(activePiece!),
                    side: activePieceData.side,
                  },
                  currentGameState,
                  boardPosition
                )
              ) {
                setCurrentGameState({
                  winner: null,
                  turn: currentGameState.turn === "white" ? "black" : "white",
                  boardState: {
                    ...currentGameState.boardState,
                    [boardPositionToId(boardPosition)]: {
                      ...activePieceData,
                      hasMoved: true,
                    },
                    [activePiece!]: undefined,
                  },
                });
                setActivePiece(null);
              }
            }}
          />
        ))}
        {Object.keys(currentGameState.boardState).map((boardPositionId) => {
          const piece = currentGameState.boardState[boardPositionId];
          return piece ? (
            <BoardPiece
              key={boardPositionId}
              active={boardPositionId === activePiece}
              clickable={currentGameState.turn === piece.side}
              onClick={() =>
                currentGameState.turn === piece.side
                  ? setActivePiece(boardPositionId)
                  : null
              }
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
