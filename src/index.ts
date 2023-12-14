import type { Block, Piece, PieceData } from './utils';
import { PIECE_MATRICES, generateBag, checkCollision, placePiece, tryWallKicks, clearLines, checkImmobile, calculateScore, checkPc, addGarbage } from './utils';

export type GameState = {
    board: Block[][];
    queue: Piece[];
    garbageQueue: number[];
    held: Piece | null;
    current: PieceData;
    isImmobile: boolean;
    canHold: boolean;
    combo: number;
    b2b: boolean;
    score: number;
    piecesPlaced: number;
    dead: boolean;
}

export type PublicGameState = {
    board: Block[][];
    queue: Piece[];
    garbageQueued: number;
    held: Piece | null;
    current: PieceData;
    isImmobile: boolean;
    canHold: boolean;
    combo: number;
    b2b: boolean;
    score: number;
    piecesPlaced: number;
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
    garbageMessiness: 0.05,
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


function spawnPiece(board: Block[][], piece: Piece, options: Options = DEFAULT_OPTIONS): {
    newPieceData: PieceData;
    collides: boolean;
} {
    const pieceData: PieceData = {
        piece,
        x: Math.floor(options.boardWidth / 2) - Math.ceil(PIECE_MATRICES[piece][0]!.length / 2),
        y: options.boardHeight,
        rotation: 0,
    };

    if (checkCollision(board, pieceData)) {
        return {
            newPieceData: pieceData,
            collides: true,
        };
    }

    return {
        newPieceData: pieceData,
        collides: false,
    };
}

export function createGameState(initialBag?: Piece[]): GameState {
    const board: Block[][] = [];

    const queue = initialBag ?? generateBag();
    if (queue.length < 6) {
        queue.push(...generateBag());
    }
    const { newPieceData: current } = spawnPiece(board, queue.shift()!);

    return {
        board,
        queue,
        garbageQueue: [],
        held: null,
        current,
        isImmobile: false,
        combo: 0,
        canHold: true,
        b2b: false,
        score: 0,
        piecesPlaced: 0,
        dead: false,
    };
}

export function getPublicGameState(gameState: GameState): PublicGameState {
    const { board, queue, garbageQueue, held, current, isImmobile, combo, canHold, b2b, score, piecesPlaced, dead } = gameState;
    const newQueue = [...queue].splice(0, 6);
    return {
        board,
        queue: newQueue,
        garbageQueued: garbageQueue.length,
        held,
        current,
        isImmobile,
        combo,
        canHold,
        b2b,
        score,
        piecesPlaced,
        dead,
    };
}

export type Command = 'move_left' | 'move_right' | 'sonic_left' | 'sonic_right' | 'drop' | 'sonic_drop' | 'hard_drop' | 'rotate_cw' | 'rotate_ccw' | 'hold';
export type GameEvent = {
    type: 'piece_placed';
    payload: {
        initial: PieceData;
        final: PieceData;
    };
} | {
    type: 'damage_tanked';
    payload: {
        holeIndices: number[];
    };
} | {
    type: 'clear';
    payload: {
        clearName: string;
        allSpin: boolean;
        b2b: boolean;
        combo: number;
        pc: boolean;
        attack: number;
        cancelled: number;
        piece: PieceData;
        clearedLines: {
            height: number;
            blocks: Block[];
        }[];
    };
} | {
    type: 'game_over';
}
export function executeCommand(gameState: GameState, command: Command, options: Partial<Options> = {}): {
    gameState: GameState;
    events: GameEvent[];
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
            const initialPieceState = structuredClone(gameState.current);
            const { gameState: newGameState, score, clear, tankedLines, finalPieceState } = hardDrop(gameState, finalOptions);
            const events: GameEvent[] = [];
            events.push({
                type: 'piece_placed',
                payload: {
                    initial: initialPieceState,
                    final: finalPieceState,
                },
            });
            if (clear) {
                events.push({
                    type: 'clear',
                    payload: clear,
                });
            }
            if (tankedLines.length > 0) {
                events.push({
                    type: 'damage_tanked',
                    payload: {
                        holeIndices: tankedLines,
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
            const events: GameEvent[] = [];
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
    events: GameEvent[];
} {
    const finalOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
    };

    let newGameState = gameState;
    const events: GameEvent[] = [];

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


export function queueGarbage(gameState: GameState, holeIndices: number[]): GameState {
    let newGameState = structuredClone(gameState);
    newGameState.garbageQueue.push(...holeIndices);

    return newGameState;
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
    clear: {
        clearName: string;
        b2b: boolean;
        combo: number;
        pc: boolean;
        cancelled: number;
        attack: number;
        piece: PieceData;
        allSpin: boolean;
        clearedLines: {
            height: number;
            blocks: Block[];
        }[];
    } | null;
    tankedLines: number[];
    finalPieceState: PieceData;
} {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);

    while (!checkCollision(newGameState.board, newGameState.current)) {
        newGameState.current.y -= 1;
    }
    newGameState.current.y += 1;

    const finalPieceState = structuredClone(newGameState.current);

    newGameState.board = placePiece(newGameState.board, newGameState.current, options);

    const { board: clearedBoard, clearedLines } = clearLines(newGameState.board);
    const cleared = clearedLines.length;
    newGameState.board = clearedBoard;

    const pc = checkPc(clearedBoard);

    const { score, b2b, combo, clearName, allSpin } = calculateScore({
        pc,
        linesCleared: cleared,
        isImmobile: newGameState.isImmobile,
        b2b: newGameState.b2b,
        combo: newGameState.combo,
    }, options);

    newGameState.combo = combo;
    newGameState.b2b = b2b;
    newGameState.score += score;
    newGameState.piecesPlaced++;

    let attack = score;
    let cancelled = 0;
    while (newGameState.garbageQueue.length > 0 && attack > 0) {
        newGameState.garbageQueue.shift();
        attack -= 1;
    }

    const tankedLines = [];
    if (cleared === 0) {
        newGameState.board = addGarbage(newGameState.board, newGameState.garbageQueue, options);
        tankedLines.push(...newGameState.garbageQueue);
        newGameState.garbageQueue = [];
    }

    const { newPieceData: newPiece, collides: isDead } = spawnPiece(newGameState.board, newGameState.queue.shift()!);
    newGameState.dead = isDead;
    newGameState.current = newPiece;

    newGameState.canHold = true;

    if (newGameState.queue.length < 6) {
        newGameState.queue.push(...generateBag());
    }

    return {
        gameState: newGameState,
        score,
        clear: clearName ? {
            clearName,
            b2b,
            combo,
            pc,
            attack,
            cancelled,
            piece: finalPieceState,
            allSpin,
            clearedLines,
        } : null,
        tankedLines,
        finalPieceState
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
    let newPiece: {
        newPieceData: PieceData;
        collides: boolean;
    };
    if (held) {
        newPiece = spawnPiece(board, held);
    } else {
        newPiece = spawnPiece(board, newGameState.queue.shift()!);
    }

    newGameState.dead = newPiece.collides;
    newGameState.current = newPiece.newPieceData;

    if (newGameState.queue.length < 6) {
        newGameState.queue.push(...generateBag());
    }

    newGameState.held = newHeld;
    newGameState.canHold = false;
    newGameState.isImmobile = checkImmobile(board, newGameState.current);

    return newGameState;
}

export { generateGarbage, getPieceMatrix, getBoardAvgHeight, getBoardBumpiness } from './utils';
export type { PieceData } from './utils';