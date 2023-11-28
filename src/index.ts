import type { Block, Piece, PieceData } from './utils';
import { PIECE_MATRICES, generateBag, checkCollision, placePiece, tryWallKicks, clearLines, checkImmobile, calculateScore, checkPc } from './utils';

export type GameState = {
    board: Block[][];
    queue: Piece[];
    held: Piece | null;
    current: PieceData;
    isImmobile: boolean;
    canHold: boolean;
    combo: number;
    b2b: boolean;
    score: number;
    dead: boolean;
}

export type BoardOptions = {
    width: number;
    height: number;
}

export const DEFAULT_BOARD_OPTIONS: BoardOptions = {
    width: 10,
    height: 20,
}

export type ScoreOptions = {
    attackTable: {
        'single': number;
        'double': number;
        'triple': number;
        'quad': number;
        'asd': number;
        'ass': number;
        'ast': number;
        'pc': number;
        'b2b': number;
    };
    comboTable: number[];
}

export const DEFAULT_SCORE_OPTIONS: ScoreOptions = {
    attackTable: {
        'single': 0,
        'double': 1,
        'triple': 2,
        'quad': 4,
        'asd': 4,
        'ass': 2,
        'ast': 6,
        'pc': 10,
        'b2b': 1,
    },
    comboTable: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4],
}

function spawnPiece(board: Block[][], piece: Piece, boardOptions: BoardOptions = DEFAULT_BOARD_OPTIONS): PieceData | false {
    const pieceData: PieceData = {
        piece,
        x: Math.floor(boardOptions.width / 2) - Math.ceil(PIECE_MATRICES[piece][0]!.length / 2),
        y: boardOptions.height,
        rotation: 0,
    };

    if (checkCollision(board, pieceData)) {
        return false;
    }

    return pieceData;
}

export function createGameState(initialBag?: Piece[]): GameState {
    const board: Block[][] = [];

    const queue = initialBag ?? generateBag();
    if (queue.length < 6) {
        queue.push(...generateBag());
    }
    const current: PieceData = spawnPiece(board, queue.shift()!) as PieceData;

    return {
        board,
        queue,
        held: null,
        current,
        isImmobile: false,
        combo: 0,
        canHold: true,
        b2b: false,
        score: 0,
        dead: false,
    };
}

type Commands = 'move_left' | 'move_right' | 'sonic_left' | 'sonic_right' | 'drop' | 'sonic_drop' | 'hard_drop' | 'rotate_cw' | 'rotate_ccw' | 'hold';
type Event = {
    type: 'attack';
    payload: {
        attackName: string;
        lines: number;
    };
} | {
    type: 'game_over';
}
export function executeCommand(gameState: GameState, command: Commands, scoreOptions: ScoreOptions = DEFAULT_SCORE_OPTIONS, boardOptions: BoardOptions = DEFAULT_BOARD_OPTIONS): {
    gameState: GameState;
    events: Event[];
} {
    switch (command) {
        case 'move_left': {
            return {
                gameState: moveLeft(gameState, boardOptions),
                events: [],
            };
        }
        case 'move_right': {
            return {
                gameState: moveRight(gameState, boardOptions),
                events: [],
            };
        }
        case 'sonic_left': {
            return {
                gameState: sonicLeft(gameState, boardOptions),
                events: [],
            };
        }
        case 'sonic_right': {
            return {
                gameState: sonicRight(gameState, boardOptions),
                events: [],
            };
        }
        case 'drop': {
            return {
                gameState: drop(gameState),
                events: [],
            };
        }
        case 'sonic_drop': {
            return {
                gameState: sonicDrop(gameState),
                events: [],
            };
        }
        case 'hard_drop': {
            const { gameState: newGameState, score, attackName } = hardDrop(gameState, scoreOptions, boardOptions);
            const events: Event[] = [];
            if (attackName) {
                events.push({
                    type: 'attack',
                    payload: {
                        attackName,
                        lines: 0,
                    },
                });
            }
            if (newGameState.dead) {
                events.push({
                    type: 'game_over',
                });
            }
            return {
                gameState: newGameState,
                events,
            };
        }
        case 'rotate_cw': {
            return {
                gameState: rotateClockwise(gameState),
                events: [],
            };
        }
        case 'rotate_ccw': {
            return {
                gameState: rotateCounterClockwise(gameState),
                events: [],
            };
        }
        case 'hold': {
            const newGameState = hold(gameState);
            const events: Event[] = [];
            if (newGameState.dead) {
                events.push({
                    type: 'game_over',
                });
            }
            return {
                gameState: newGameState,
                events,
            };
        }
    }
}

export function executeCommands(gameState: GameState, commands: Commands[], scoreOptions: ScoreOptions = DEFAULT_SCORE_OPTIONS, boardOptions: BoardOptions = DEFAULT_BOARD_OPTIONS): {
    gameState: GameState;
    events: Event[];
} {
    let newGameState = gameState;
    const events: Event[] = [];

    for (const command of commands) {
        const { gameState: newNewGameState, events: newEvents } = executeCommand(newGameState, command, scoreOptions, boardOptions);
        newGameState = newNewGameState;
        events.push(...newEvents);
    }

    return {
        gameState: newGameState,
        events,
    };
}

export function moveLeft(gameState: GameState, boardOptions: BoardOptions = DEFAULT_BOARD_OPTIONS): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    current.x -= 1;
    if (checkCollision(board, current, boardOptions)) {
        current.x += 1;
    }

    return newGameState;
}

export function moveRight(gameState: GameState, boardOptions: BoardOptions = DEFAULT_BOARD_OPTIONS): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    current.x += 1;
    if (checkCollision(board, current, boardOptions)) {
        current.x -= 1;
    }

    return newGameState;
}

export function sonicRight(gameState: GameState, boardOptions: BoardOptions = DEFAULT_BOARD_OPTIONS): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    while (!checkCollision(board, current, boardOptions)) {
        current.x += 1;
    }
    current.x -= 1;

    return newGameState;
}

export function sonicLeft(gameState: GameState, boardOptions: BoardOptions = DEFAULT_BOARD_OPTIONS): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    while (!checkCollision(board, current, boardOptions)) {
        current.x -= 1;
    }
    current.x += 1;

    return newGameState;
}

export function drop(gameState: GameState): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    current.y -= 1;
    if (checkCollision(board, current)) {
        current.y += 1;
    }

    return newGameState;
}

export function sonicDrop(gameState: GameState): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    while (!checkCollision(board, current)) {
        current.y -= 1;
    }
    current.y += 1;

    return newGameState;
}

export function hardDrop(gameState: GameState, scoreOptions: ScoreOptions = DEFAULT_SCORE_OPTIONS, boardOptions: BoardOptions = DEFAULT_BOARD_OPTIONS): {
    gameState: GameState;
    score: number;
    attackName: string | null;
} {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);

    while (!checkCollision(newGameState.board, newGameState.current)) {
        newGameState.current.y -= 1;
    }
    newGameState.current.y += 1;

    newGameState.board = placePiece(newGameState.board, newGameState.current, boardOptions);

    const { board: clearedBoard, cleared } = clearLines(newGameState.board);
    newGameState.board = clearedBoard;

    const pc = checkPc(clearedBoard);

    const { score, b2b, combo, attackName } = calculateScore({
        pc,
        linesCleared: cleared,
        isImmobile: newGameState.isImmobile,
        b2b: newGameState.b2b,
        combo: newGameState.combo,
    }, scoreOptions);

    newGameState.combo = combo;
    newGameState.b2b = b2b;
    newGameState.score += score;

    const newPiece = spawnPiece(newGameState.board, newGameState.queue.shift()!);
    if (!newPiece) {
        newGameState.dead = true;
    } else {
        newGameState.current = newPiece;
    }

    if (newGameState.queue.length < 6) {
        newGameState.queue.push(...generateBag());
    }

    return {
        gameState: newGameState,
        score,
        attackName
    };
}

export function rotateClockwise(gameState: GameState): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    const initialRotation = current.rotation;
    const newRotation = (current.rotation + 1) % 4 as 0 | 1 | 2 | 3;

    const wallKickData = tryWallKicks(board, current, newRotation);
    if (wallKickData.success) {
        newGameState.current = wallKickData.pieceData;
        newGameState.isImmobile = checkImmobile(board, newGameState.current);
    } else {
        current.rotation = initialRotation;
    }

    return newGameState;
}

export function rotateCounterClockwise(gameState: GameState): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    const initialRotation = current.rotation;
    const newRotation = (current.rotation + 1) % 4 as 0 | 1 | 2 | 3;

    const wallKickData = tryWallKicks(board, current, newRotation);
    if (wallKickData.success) {
        newGameState.current = wallKickData.pieceData;
        newGameState.isImmobile = checkImmobile(board, newGameState.current);
    } else {
        current.rotation = initialRotation;
    }

    return newGameState;
}

export function hold(gameState: GameState): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board, held, canHold } = newGameState;

    if (!canHold) {
        return newGameState;
    }

    const newHeld = current.piece;
    let newPiece: PieceData | false;
    if (held) {
        newPiece = spawnPiece(board, held);
    } else {
        newPiece = spawnPiece(board, newGameState.queue.shift()!);
    }

    if (!newPiece) {
        newGameState.dead = true;
    } else {
        newGameState.current = newPiece;
    }

    if (newGameState.queue.length < 6) {
        newGameState.queue.push(...generateBag());
    }

    newGameState.held = newHeld;
    newGameState.canHold = false;
    newGameState.isImmobile = checkImmobile(board, newGameState.current);

    return newGameState;
}