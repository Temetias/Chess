// TODO: Move this to a shared folder for the back and frontend

type StepBase = 0 | 1 | -1;

type Step = [StepBase, StepBase];

type Move = Step[];

type PieceType =
  | "pawn white"
  | "pawn black"
  | "rook"
  | "knight"
  | "bishop"
  | "queen"
  | "king";

type Side = "white" | "black";

type BoardCoordinate = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const createBoardPosition = (
  x: BoardCoordinate,
  y: BoardCoordinate
) => ({
  value: () => [x, y],
  toId: () => `${x}${y}`,
  map: (
    f: (
      pos: [BoardCoordinate, BoardCoordinate]
    ) => [BoardCoordinate, BoardCoordinate]
  ) => {
    const [computedX, computedY] = f([x, y]);
    return createBoardPosition(computedX, computedY);
  },
});

export type BoardPosition = ReturnType<typeof createBoardPosition>;

export type Piece = {
  id: string;
  type: PieceType;
  hasMoved: boolean;
  side: Side;
};

export type GameState = {
  turn: Side;
  winner: Side | null;
  boardState: Record<string, Piece | undefined>;
  check: boolean;
};

const twice = (step: Step): Move => [step, step];

const STEPS = {
  forward: [0, 1] as Step,
  backward: [0, -1] as Step,
  right: [1, 0] as Step,
  left: [-1, 0] as Step,
  forwardRight: [1, 1] as Step,
  forwardLeft: [-1, 1] as Step,
  backwardRight: [1, -1] as Step,
  backwardLeft: [-1, -1] as Step,
};

const STEP_SETS = {
  diagonals: [
    STEPS.forwardLeft,
    STEPS.forwardRight,
    STEPS.backwardLeft,
    STEPS.backwardRight,
  ] as Step[],
  directionals: [
    STEPS.forward,
    STEPS.backward,
    STEPS.left,
    STEPS.right,
  ] as Step[],
};

type PieceData = {
  boardPosition: BoardPosition;
  side: Side;
  type: PieceType;
};

type MoveCheck = (
  gameState: GameState
) => (pieceData: PieceData) => Move | null;

type MoveCheckBuilder = (move: Move) => MoveCheck;

const calculateStep = ([xStep, yStep]: Step) => (
  boardPosition: BoardPosition
): BoardPosition => {
  const [xPos, yPos] = boardPosition.value();
  return createBoardPosition(
    (xPos + xStep) as BoardCoordinate,
    (yPos + yStep) as BoardCoordinate
  );
};

const calculateMove = (boardPosition: BoardPosition) => (
  move: Move
): BoardPosition =>
  move.reduce((acc, cur) => calculateStep(cur)(acc), boardPosition);

export const boardIdToPosition = ([x, y]: string) =>
  createBoardPosition(
    parseInt(x) as BoardCoordinate,
    parseInt(y) as BoardCoordinate
  );

const ifIsFirstMove = (move: Move) => ({ boardState }: GameState) => ({
  boardPosition,
}: PieceData) =>
  boardState[boardPosition.toId()] &&
  !boardState[boardPosition.toId()]?.hasMoved
    ? move
    : null;

const getTargetPiece = ({ boardState }: GameState) => ({
  boardPosition,
}: PieceData) => (move: Move) =>
  boardState[calculateMove(boardPosition)(move).toId()];

const ifEats = (move: Move) => (gameState: GameState) => (
  pieceData: PieceData
) => {
  const targetPiece = getTargetPiece(gameState)(pieceData)(move);
  return !!targetPiece && targetPiece.side !== pieceData.side ? move : null;
};

const ifNotEats = (move: Move) => (gameState: GameState) => (
  pieceData: PieceData
) => (!!ifEats(move)(gameState)(pieceData) ? null : move);

const unlimited = (step: Step): Move[] =>
  Array(8)
    .fill({})
    .map((_, i) =>
      Array(i + 1)
        .fill({})
        .map(() => step)
    );

const ifNotCollide = (move: Move) => ({ boardState }: GameState) => ({
  boardPosition,
}: PieceData): Move | null => {
  let currentBoardPosition: BoardPosition = boardPosition;
  for (const [i, step] of move.entries()) {
    currentBoardPosition = calculateStep(step)(currentBoardPosition);
    if (!!boardState[currentBoardPosition.toId()] && i + 1 < move.length) {
      return null;
    }
  }
  return move;
};

const ifNotPopulated = (move: Move) => ({ boardState }: GameState) => ({
  boardPosition,
  side,
}: PieceData) => {
  const targetPiece = boardState[calculateMove(boardPosition)(move).toId()];
  return targetPiece && targetPiece.side === side ? null : move;
};

const ifInsideBoard = (move: Move) => (_: GameState) => ({
  boardPosition,
}: PieceData): Move | null => {
  const [xTarget, yTarget] = calculateMove(boardPosition)(move).value();
  return xTarget > 7 || yTarget > 7 || xTarget < 0 || yTarget < 0 ? null : move;
};

const combineChecks = (...moveChecks: MoveCheckBuilder[]): MoveCheckBuilder => (
  move
) => (gameState) => (pieceData) =>
  moveChecks.reduce(
    (acc, cur) => (acc ? cur(acc)(gameState)(pieceData) : acc),
    move as Move | null
  );

const ifInsideBoardAndNotCollide = combineChecks(
  ifInsideBoard,
  ifNotCollide,
  ifNotPopulated
);

export const PIECE_MOVE_CHECKS: Record<PieceType, MoveCheck[]> = {
  ...["black", "white"].reduce(
    (acc, cur) => ({
      ...acc,
      [`pawn ${cur}`]: [
        combineChecks(
          ifNotEats,
          ifIsFirstMove,
          ifInsideBoardAndNotCollide
        )(twice(STEPS[cur === "black" ? "forward" : "backward"])),
        combineChecks(
          ifNotEats,
          ifInsideBoardAndNotCollide,
          ifNotPopulated
        )([STEPS[cur === "black" ? "forward" : "backward"]]),
        combineChecks(
          ifEats,
          ifInsideBoardAndNotCollide,
          ifNotPopulated
        )([STEPS[cur === "black" ? "forwardLeft" : "backwardLeft"]]),
        combineChecks(
          ifEats,
          ifInsideBoardAndNotCollide
        )([STEPS[cur === "black" ? "forwardRight" : "backwardRight"]]),
      ],
    }),
    {} as Record<PieceType, MoveCheck[]>
  ),
  rook: STEP_SETS.directionals
    .map(unlimited)
    .flat()
    .map(ifInsideBoardAndNotCollide),
  knight: [
    [STEPS.forwardLeft, STEPS.left],
    [STEPS.forwardLeft, STEPS.forward],
    [STEPS.forwardRight, STEPS.right],
    [STEPS.forwardRight, STEPS.forward],
    [STEPS.backwardLeft, STEPS.left],
    [STEPS.backwardLeft, STEPS.backward],
    [STEPS.backwardRight, STEPS.right],
    [STEPS.backwardRight, STEPS.backward],
  ].map(combineChecks(ifInsideBoard, ifNotPopulated)),
  bishop: STEP_SETS.diagonals
    .map(unlimited)
    .flat()
    .map(ifInsideBoardAndNotCollide),
  queen: [
    ...STEP_SETS.diagonals.map(unlimited).flat(),
    ...STEP_SETS.directionals.map(unlimited).flat(),
  ].map(ifInsideBoardAndNotCollide),
  king: [
    ...STEP_SETS.diagonals.map((step) => [step]),
    ...STEP_SETS.directionals.map((step) => [step]),
  ].map(ifInsideBoardAndNotCollide),
};

const createPawns = (side: Side, boardPosition: BoardPosition) =>
  Array(4)
    .fill({})
    .reduce(
      (acc, _, i) =>
        ({
          ...acc,
          ...createPiecePair(
            side,
            `pawn ${side}` as PieceType,
            boardPosition.map(([xPos, yPos]) => [
              (xPos + i) as BoardCoordinate,
              yPos,
            ])
          ),
        } as GameState["boardState"]),
      {} as GameState["boardState"]
    );

const createPiece = (
  side: Side,
  type: PieceType,
  boardPosition: BoardPosition,
  secondOfPair: boolean = false
): GameState["boardState"] => ({
  [boardPosition.toId()]: {
    hasMoved: false,
    id: `${side}${type}${secondOfPair ? 1 : 0}`,
    type,
    side,
  },
});

const createPiecePair = (
  side: Side,
  type: PieceType,
  boardPosition: BoardPosition
): GameState["boardState"] => {
  const [xPos, yPos] = boardPosition.value();
  return {
    ...createPiece(side, type, boardPosition),
    ...createPiece(
      side,
      type,
      createBoardPosition((7 - xPos) as BoardCoordinate, yPos),
      true
    ),
  };
};

export const INITIAL_GAME_STATE: GameState = {
  boardState: {
    ...createPawns("black", createBoardPosition(0, 1)),
    ...createPiecePair("black", "rook", createBoardPosition(0, 0)),
    ...createPiecePair("black", "knight", createBoardPosition(1, 0)),
    ...createPiecePair("black", "bishop", createBoardPosition(2, 0)),
    ...createPiece("black", "queen", createBoardPosition(3, 0)),
    ...createPiece("black", "king", createBoardPosition(4, 0)),
    ...createPawns("white", createBoardPosition(0, 6)),
    ...createPiecePair("white", "rook", createBoardPosition(0, 7)),
    ...createPiecePair("white", "knight", createBoardPosition(1, 7)),
    ...createPiecePair("white", "bishop", createBoardPosition(2, 7)),
    ...createPiece("white", "queen", createBoardPosition(3, 7)),
    ...createPiece("white", "king", createBoardPosition(4, 7)),
  },
  turn: "white",
  winner: null,
  check: false,
};

export const getAllowedMoves = (pieceData: PieceData, gameState: GameState) =>
  PIECE_MOVE_CHECKS[pieceData.type]
    .map((moveCheck) => moveCheck(gameState)(pieceData))
    .filter((move) => !!move) as Move[];

const threatensKing = (pieceData: PieceData, gameState: GameState) => {
  for (const move of getAllowedMoves(pieceData, gameState)) {
    const targetPiece = getTargetPiece(gameState)(pieceData)(move);
    if (
      targetPiece &&
      targetPiece.side !== pieceData.side &&
      targetPiece.type === "king"
    ) {
      return true;
    }
  }
  return false;
};

const checkCheck = (gameState: GameState, side: Side) =>
  Object.keys(gameState.boardState)
    .filter(
      (boardPositionId) =>
        gameState.boardState[boardPositionId] &&
        gameState.boardState[boardPositionId]?.side !== side
    )
    .filter((boardPositionId) =>
      threatensKing(
        {
          ...gameState.boardState[boardPositionId]!,
          boardPosition: boardIdToPosition(boardPositionId),
        },
        gameState
      )
    ).length > 0;

const openCheckCheck = (gameState: GameState, pieceData: PieceData) => (
  move: Move
) => {
  const projectedGameState: GameState = {
    ...gameState,
    boardState: projectBoardState(
      pieceData,
      gameState,
      calculateMove(pieceData.boardPosition)(move)
    ),
  };
  return checkCheck(projectedGameState, pieceData.side) ? null : move;
};

export const moveIsAllowed = (
  pieceData: PieceData,
  gameState: GameState,
  targetBoardPosition: BoardPosition
) =>
  (getAllowedMoves(pieceData, gameState)
    .map(openCheckCheck(gameState, pieceData))
    .filter((move) => !!move) as Move[])
    .map(calculateMove(pieceData.boardPosition))
    .map((boardPosition) => boardPosition.toId())
    .includes(targetBoardPosition.toId());

const projectBoardState = (
  pieceData: PieceData,
  gameState: GameState,
  targetBoardPosition: BoardPosition
): GameState["boardState"] => ({
  ...gameState.boardState,
  [targetBoardPosition.toId()]: {
    ...gameState.boardState[pieceData.boardPosition.toId()]!,
    hasMoved: true,
  },
  [pieceData.boardPosition.toId()]: undefined,
});

const getPiecesOfColor = (
  boardState: GameState["boardState"],
  side: Side
): PieceData[] =>
  Object.keys(boardState)
    .filter(
      (boardPositionId) =>
        boardState[boardPositionId] &&
        boardState[boardPositionId]?.side === side
    )
    .map((boardPositionId) => ({
      ...boardState[boardPositionId],
      boardPosition: boardIdToPosition(boardPositionId),
    })) as PieceData[];

const notPlayingSide = ({ turn }: GameState): Side =>
  turn === "black" ? "white" : "black";

const checkLose = (gameState: GameState) =>
  getPiecesOfColor(gameState.boardState, notPlayingSide(gameState))
    .map((pieceData) =>
      getAllowedMoves(pieceData, gameState).filter((move) =>
        moveIsAllowed(
          pieceData,
          gameState,
          calculateMove(pieceData.boardPosition)(move)
        )
      )
    )
    .flat().length === 0;

export const calculateNextGamestate = (
  pieceData: PieceData,
  gameState: GameState,
  targetBoardPosition: BoardPosition
): GameState =>
  moveIsAllowed(pieceData, gameState, targetBoardPosition)
    ? (() => {
        const projectedBoardState = projectBoardState(
          pieceData,
          gameState,
          targetBoardPosition
        );
        return {
          boardState: projectedBoardState,
          check: checkCheck(
            {
              ...gameState,
              boardState: projectedBoardState,
            },
            notPlayingSide(gameState)
          ),
          winner: checkLose({
            ...gameState,
            boardState: projectedBoardState,
          })
            ? gameState.turn
            : null,
          turn: notPlayingSide(gameState),
        };
      })()
    : gameState;
