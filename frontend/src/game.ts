// TODO: Move this to a shared folder for the back and frontend

type StepBase = 0 | 1 | -1;

type Step = [StepBase, StepBase];

export type Move = Step[];

type PieceType =
  | "pawn white"
  | "pawn black"
  | "rook"
  | "knight"
  | "bishop"
  | "queen"
  | "king";

export type Side = "white" | "black";

type BoardCoordinate = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type BoardPosition = [BoardCoordinate, BoardCoordinate];

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

export type PieceData = {
  boardPosition: BoardPosition;
  side: Side;
  type: PieceType;
};

type MoveCheck = (
  gameState: GameState
) => (pieceData: PieceData) => Move | null;

type MoveCheckBuilder = (move: Move) => MoveCheck;

const calculateStep = ([xStep, yStep]: Step) => ([
  xPos,
  yPos,
]: BoardPosition): BoardPosition => [
  (xPos + xStep) as BoardCoordinate,
  (yPos + yStep) as BoardCoordinate,
];

const calculateMove = (boardPosition: BoardPosition) => (
  move: Move
): BoardPosition =>
  move.reduce((acc, cur) => calculateStep(cur)(acc), boardPosition);

export const boardPositionToId = ([x, y]: BoardPosition) => `${x}${y}`;

export const boardIdToPosition = ([x, y]: string) =>
  [parseInt(x), parseInt(y)] as BoardPosition;

const ifIsFirstMove = (move: Move) => ({ boardState }: GameState) => ({
  boardPosition,
}: PieceData) =>
  boardState[boardPositionToId(boardPosition)] &&
  !boardState[boardPositionToId(boardPosition)]?.hasMoved
    ? move
    : null;

const getTargetPiece = ({ boardState }: GameState) => ({
  boardPosition,
}: PieceData) => (move: Move) =>
  boardState[boardPositionToId(calculateMove(boardPosition)(move))];

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
  const [xPos, yPos] = boardPosition;
  let currentBoardPosition: BoardPosition = [xPos, yPos];
  for (const [i, step] of move.entries()) {
    currentBoardPosition = calculateStep(step)(currentBoardPosition);
    if (
      !!boardState[boardPositionToId(currentBoardPosition)] &&
      i + 1 < move.length
    ) {
      return null;
    }
  }
  return move;
};

const ifNotPopulated = (move: Move) => ({ boardState }: GameState) => ({
  boardPosition,
  side,
}: PieceData) => {
  const targetPiece =
    boardState[boardPositionToId(calculateMove(boardPosition)(move))];
  return targetPiece && targetPiece.side === side ? null : move;
};

const insideBoard = (move: Move) => (_: GameState) => ({
  boardPosition,
}: PieceData): Move | null => {
  const [xTarget, yTarget] = calculateMove(boardPosition)(move);
  return xTarget > 7 || yTarget > 7 || xTarget < 0 || yTarget < 0 ? null : move;
};

const combineChecks = (...moveChecks: MoveCheckBuilder[]): MoveCheckBuilder => (
  move
) => (gameState) => (pieceData) =>
  moveChecks.reduce(
    (acc, cur) => (acc ? cur(acc)(gameState)(pieceData) : acc),
    move as Move | null
  );

const insideBoardAndNotCollide = combineChecks(insideBoard, ifNotCollide);

export const PIECE_MOVE_CHECKS: Record<PieceType, MoveCheck[]> = {
  ...["black", "white"].reduce(
    (acc, cur) => ({
      ...acc,
      [`pawn ${cur}`]: [
        combineChecks(
          ifNotEats,
          ifIsFirstMove,
          insideBoardAndNotCollide,
          ifNotPopulated
        )(twice(STEPS[cur === "black" ? "forward" : "backward"])),
        combineChecks(
          ifNotEats,
          insideBoardAndNotCollide,
          ifNotPopulated
        )([STEPS[cur === "black" ? "forward" : "backward"]]),
        combineChecks(
          ifEats,
          insideBoardAndNotCollide,
          ifNotPopulated
        )([STEPS[cur === "black" ? "forwardLeft" : "backwardLeft"]]),
        combineChecks(
          ifEats,
          insideBoardAndNotCollide,
          ifNotPopulated
        )([STEPS[cur === "black" ? "forwardRight" : "backwardRight"]]),
      ],
    }),
    {} as Record<PieceType, MoveCheck[]>
  ),
  rook: STEP_SETS.directionals
    .map(unlimited)
    .flat()
    .map(combineChecks(insideBoardAndNotCollide, ifNotPopulated)),
  knight: [
    [STEPS.forwardLeft, STEPS.left],
    [STEPS.forwardLeft, STEPS.forward],
    [STEPS.forwardRight, STEPS.right],
    [STEPS.forwardRight, STEPS.forward],
    [STEPS.backwardLeft, STEPS.left],
    [STEPS.backwardLeft, STEPS.backward],
    [STEPS.backwardRight, STEPS.right],
    [STEPS.backwardRight, STEPS.backward],
  ].map(combineChecks(insideBoard, ifNotPopulated)),
  bishop: STEP_SETS.diagonals
    .map(unlimited)
    .flat()
    .map(combineChecks(insideBoardAndNotCollide, ifNotPopulated)),
  queen: [
    ...STEP_SETS.diagonals.map(unlimited).flat(),
    ...STEP_SETS.directionals.map(unlimited).flat(),
  ].map(combineChecks(insideBoardAndNotCollide, ifNotPopulated)),
  king: [
    ...STEP_SETS.diagonals.map((step) => [step]),
    ...STEP_SETS.directionals.map((step) => [step]),
  ].map(combineChecks(insideBoardAndNotCollide, ifNotPopulated)),
};

const createPawns = (side: Side, [xPos, yPos]: BoardPosition) =>
  Array(4)
    .fill({})
    .reduce(
      (acc, _, i) =>
        ({
          ...acc,
          ...createPiecePair(side, `pawn ${side}` as PieceType, [
            (xPos + i) as BoardCoordinate,
            yPos,
          ]),
        } as GameState["boardState"]),
      {} as GameState["boardState"]
    );

const createPiece = (
  side: Side,
  type: PieceType,
  boardPosition: BoardPosition,
  secondOfPair: boolean = false
): GameState["boardState"] => ({
  [boardPositionToId(boardPosition)]: {
    hasMoved: false,
    id: `${side}${type}${secondOfPair ? 1 : 0}`,
    type,
    side,
  },
});

const createPiecePair = (
  side: Side,
  type: PieceType,
  [xPos, yPos]: BoardPosition
): GameState["boardState"] => ({
  ...createPiece(side, type, [xPos, yPos]),
  ...createPiece(side, type, [(7 - xPos) as BoardCoordinate, yPos], true),
});

export const INITIAL_GAME_STATE: GameState = {
  boardState: {
    ...createPawns("black", [0, 1]),
    ...createPiecePair("black", "rook", [0, 0]),
    ...createPiecePair("black", "knight", [1, 0]),
    ...createPiecePair("black", "bishop", [2, 0]),
    ...createPiece("black", "queen", [3, 0]),
    ...createPiece("black", "king", [4, 0]),
    ...createPawns("white", [0, 6]),
    ...createPiecePair("white", "rook", [0, 7]),
    ...createPiecePair("white", "knight", [1, 7]),
    ...createPiecePair("white", "bishop", [2, 7]),
    ...createPiece("white", "queen", [3, 7]),
    ...createPiece("white", "king", [4, 7]),
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
    .map(boardPositionToId)
    .includes(boardPositionToId(targetBoardPosition));

const projectBoardState = (
  pieceData: PieceData,
  gameState: GameState,
  targetBoardPosition: BoardPosition
): GameState["boardState"] => {
  const currentBoardPositionId = boardPositionToId(pieceData.boardPosition);
  return {
    ...gameState.boardState,
    [boardPositionToId(targetBoardPosition)]: {
      ...gameState.boardState[currentBoardPositionId]!,
      hasMoved: true,
    },
    [currentBoardPositionId]: undefined,
  };
};

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
