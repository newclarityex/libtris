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

export type Options = {
    boardWidth: number;
    boardHeight: number;
    garbageMessiness: number;

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

export const DEFAULT_OPTIONS: Options = {
    boardWidth: 10,
    boardHeight: 20,
    garbageMessiness: 0.2,
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

function spawnPiece(board: Block[][], piece: Piece, options: Options = DEFAULT_OPTIONS): PieceData | false {
    const pieceData: PieceData = {
        piece,
        x: Math.floor(options.boardWidth / 2) - Math.ceil(PIECE_MATRICES[piece][0]!.length / 2),
        y: options.boardHeight,
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

type Command = 'move_left' | 'move_right' | 'sonic_left' | 'sonic_right' | 'drop' | 'sonic_drop' | 'hard_drop' | 'rotate_cw' | 'rotate_ccw' | 'hold';
type Event = {
    type: 'attack';
    payload: {
        attackName: string;
        lines: number;
    };
} | {
    type: 'game_over';
}
export function executeCommand(gameState: GameState, command: Command, options: Partial<Options> = {}): {
    gameState: GameState;
    events: Event[];
} {
    const finalOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
    };

    switch (command) {
        case 'move_left': {
            return {
                gameState: moveLeft(gameState, finalOptions),
                events: [],
            };
        }
        case 'move_right': {
            return {
                gameState: moveRight(gameState, finalOptions),
                events: [],
            };
        }
        case 'sonic_left': {
            return {
                gameState: sonicLeft(gameState, finalOptions),
                events: [],
            };
        }
        case 'sonic_right': {
            return {
                gameState: sonicRight(gameState, finalOptions),
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
            const { gameState: newGameState, score, attackName } = hardDrop(gameState, finalOptions);
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

export function executeCommands(gameState: GameState, commands: Command[], options: Partial<Options> = {}): {
    gameState: GameState;
    events: Event[];
} {
    const finalOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
    };

    let newGameState = gameState;
    const events: Event[] = [];

    for (const command of commands) {
        const { gameState: newNewGameState, events: newEvents } = executeCommand(newGameState, command, finalOptions);
        newGameState = newNewGameState;
        events.push(...newEvents);
    }

    return {
        gameState: newGameState,
        events,
    };
}

export function moveLeft(gameState: GameState, options: Options = DEFAULT_OPTIONS): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    current.x -= 1;
    if (checkCollision(board, current, options)) {
        current.x += 1;
    }

    return newGameState;
}

export function moveRight(gameState: GameState, options: Options = DEFAULT_OPTIONS): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    current.x += 1;
    if (checkCollision(board, current, options)) {
        current.x -= 1;
    }

    return newGameState;
}

export function sonicRight(gameState: GameState, options: Options = DEFAULT_OPTIONS): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    while (!checkCollision(board, current, options)) {
        current.x += 1;
    }
    current.x -= 1;

    return newGameState;
}

export function sonicLeft(gameState: GameState, options: Options = DEFAULT_OPTIONS): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    while (!checkCollision(board, current, options)) {
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

export function hardDrop(gameState: GameState, options: Options = DEFAULT_OPTIONS): {
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

    newGameState.board = placePiece(newGameState.board, newGameState.current, options);

    const { board: clearedBoard, cleared } = clearLines(newGameState.board);
    newGameState.board = clearedBoard;

    const pc = checkPc(clearedBoard);

    const { score, b2b, combo, attackName } = calculateScore({
        pc,
        linesCleared: cleared,
        isImmobile: newGameState.isImmobile,
        b2b: newGameState.b2b,
        combo: newGameState.combo,
    }, options);

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
    const newRotation = (current.rotation + 3) % 4 as 0 | 1 | 2 | 3;

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

export function addGarbage(gameState: GameState, lines: number, options: Options = DEFAULT_OPTIONS): GameState {
    const newGameState = structuredClone(gameState);
    const { board } = newGameState;

    let lastHole: number | null = null;
    for (let i = 0; i < lines; i++) {
        const line: Block[] = Array.from({ length: options.boardWidth }, () => 'G');
        if (lastHole === null) {
            lastHole = Math.floor(Math.random() * line.length);
        } else if (Math.random() < options.garbageMessiness) {
            lastHole = Math.floor(Math.random() * line.length);
        }
        line[lastHole] = null;
        board.unshift(line);
    }

    return newGameState;
}