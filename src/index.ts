import type { Block, GarbageLine, Piece, PieceData } from './utils.js';
import { PIECE_MATRICES, generateBag, checkCollision, placePiece, tryWallKicks, clearLines, checkImmobile, calculateScore, checkPc, addGarbage } from './utils.js';
import type { Options } from './config.js';
import { DEFAULT_OPTIONS } from './config.js';
import type { ClearName } from './utils.js';

export type PublicGarbageLine = {
    delay: number;
};

export type GameState = {
    board: Block[][];
    queue: Piece[];
    garbageQueue: GarbageLine[];
    held: Piece | null;
    current: PieceData;
    isImmobile: boolean;
    canHold: boolean;
    combo: number;
    b2b: boolean;
    score: number;
    piecesPlaced: number;
    garbageCleared: number;
    dead: boolean;
}

export type PublicGameState = {
    board: Block[][];
    queue: Piece[];
    garbageQueued: PublicGarbageLine[];
    held: Piece | null;
    current: PieceData;
    canHold: boolean;
    combo: number;
    b2b: boolean;
    score: number;
    piecesPlaced: number;
    garbageCleared: number;
    dead: boolean;
}


function spawnPiece(board: Block[][], piece: Piece, options: Partial<Options> = {}): {
    newPieceData: PieceData;
    collides: boolean;
} {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };
    const pieceData: PieceData = {
        piece,
        x: Math.floor(finalOptions.boardWidth / 2) - Math.ceil(PIECE_MATRICES[piece][0]!.length / 2),
        y: finalOptions.boardHeight,
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
        garbageCleared: 0,
        dead: false,
    };
}

export function getPublicGameState(gameState: GameState): PublicGameState {
    const { board, queue, garbageQueue, held, current, combo, canHold, b2b, score, piecesPlaced, garbageCleared, dead } = gameState;
    const newQueue = [...queue].splice(0, 6);
    return {
        board,
        queue: newQueue,
        garbageQueued: garbageQueue.map(line => ({ delay: line.delay })),
        held,
        current,
        combo,
        canHold,
        b2b,
        score,
        piecesPlaced,
        garbageCleared,
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
        score: number;
        clearName: ClearName;
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
            const { gameState: newGameState, clear, tankedLines, finalPieceState } = hardDrop(gameState, finalOptions);
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


export function queueGarbage(gameState: GameState, holeIndices: number[], options: Partial<Options> = {}): GameState {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };

    let newGameState = structuredClone(gameState);
    let garbageLines = holeIndices.map(index => ({ index, delay: finalOptions.garbageDelay }));
    newGameState.garbageQueue.push(...garbageLines);

    return newGameState;
}

export function processGarbage(gameState: GameState, options: Partial<Options> = {}) {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };
    let newGameState = structuredClone(gameState);

    let expiredLines = newGameState.garbageQueue.filter(line => line.delay <= 0);
    newGameState.garbageQueue = newGameState.garbageQueue.filter(line => line.delay > 0);

    let expiredIndices = expiredLines.map(line => line.index);
    newGameState.board = addGarbage(newGameState.board, expiredIndices);

    for (const line of newGameState.garbageQueue) {
        line.delay -= 1;
    };


    return { newGameState, expiredIndices };
};

export function moveLeft(gameState: GameState, options: Partial<Options> = {}): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    current.x -= 1;
    if (checkCollision(board, current, options)) {
        current.x += 1;
    }

    return newGameState;
}

export function moveRight(gameState: GameState, options: Partial<Options> = {}): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    current.x += 1;
    if (checkCollision(board, current, options)) {
        current.x -= 1;
    }

    return newGameState;
}

export function sonicRight(gameState: GameState, options: Partial<Options> = {}): GameState {
    if (gameState.dead) throw new Error('Cannot act when dead');

    const newGameState = structuredClone(gameState);
    const { current, board } = newGameState;

    while (!checkCollision(board, current, options)) {
        current.x += 1;
    }
    current.x -= 1;

    return newGameState;
}

export function sonicLeft(gameState: GameState, options: Partial<Options> = {}): GameState {
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

export function hardDrop(gameState: GameState, options: Partial<Options> = {}): {
    gameState: GameState;
    clear: {
        score: number;
        clearName: ClearName;
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

    let newGameState = structuredClone(gameState);

    while (!checkCollision(newGameState.board, newGameState.current)) {
        newGameState.current.y -= 1;
    }
    newGameState.current.y += 1;

    const finalPieceState = structuredClone(newGameState.current);

    newGameState.board = placePiece(newGameState.board, newGameState.current, options);

    const { board: clearedBoard, clearedLines } = clearLines(newGameState.board);
    const cleared = clearedLines.length;
    for (const line of clearedLines) {
        if (line.blocks.some(block => block === "G")) {
            newGameState.garbageCleared += 1;
        };
    };

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
        cancelled += 1;
    }

    let tankedLines: number[] = [];
    if (cleared === 0) {
        let { newGameState: garbageGameState, expiredIndices } = processGarbage(newGameState, options);
        newGameState = garbageGameState;
        tankedLines = expiredIndices;
    };

    const { newPieceData: newPiece, collides: isDead } = spawnPiece(newGameState.board, newGameState.queue.shift()!);
    newGameState.dead = isDead;
    newGameState.current = newPiece;

    newGameState.isImmobile = false;
    newGameState.canHold = true;

    if (newGameState.queue.length < 6) {
        newGameState.queue.push(...generateBag());
    }

    return {
        gameState: newGameState,
        clear: clearName ? {
            score,
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
    newGameState.isImmobile = false;

    return newGameState;
}

export { generateGarbage, getPieceMatrix, getBoardAvgHeight, getBoardHeights, getBoardBumpiness } from './utils.js';
export type { PieceData, Block, ClearName, GarbageLine } from './utils.js';
export type { Options } from './config.js';
export { DEFAULT_OPTIONS } from './config.js';