import shuffle from "shuffle-array";
import type { Options } from "./index";
import { DEFAULT_OPTIONS } from "./index";

export type Piece = 'I' | 'O' | 'J' | 'L' | 'S' | 'Z' | 'T';
export type Block = Piece | null | 'G';

const PIECES: Piece[] = ['I', 'O', 'J', 'L', 'S', 'Z', 'T'];

export function generateBag() {
    const bag = [...PIECES];
    shuffle(bag);
    return bag;
}

export type PieceData = {
    piece: Piece;
    x: number;
    y: number;
    rotation: 0 | 1 | 2 | 3;
}

export const PIECE_MATRICES: {
    [key in Piece]: (Piece | null)[][];
} = {
    "Z": [
        ["Z", "Z", null],
        [null, "Z", "Z"],
        [null, null, null]
    ],
    "L": [
        [null, null, "L"],
        ["L", "L", "L"],
        [null, null, null]
    ],
    "O": [
        ["O", "O"],
        ["O", "O"]
    ],
    "S": [
        [null, "S", "S"],
        ["S", "S", null],
        [null, null, null]
    ],
    "I": [
        [null, null, null, null],
        ["I", "I", "I", "I"],
        [null, null, null, null],
        [null, null, null, null]
    ],
    "J": [
        ["J", null, null],
        ["J", "J", "J"],
        [null, null, null]
    ],
    "T": [
        [null, "T", null],
        ["T", "T", "T"],
        [null, null, null]
    ],
};

const WALLKICKS: {
    [key: string]: [number, number][];
} = {
    "0-1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "1-0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "1-2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "2-1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "2-3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "3-2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "3-0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "0-3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const I_WALLKICKS: {
    [key: string]: [number, number][];
} = {
    "0-1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "1-0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "1-2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    "2-1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "2-3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "3-2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "3-0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "0-3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export function rotateMatrix<T>(matrix: T[][], rotation: 0 | 1 | 2 | 3): T[][] {
    let newMatrix = matrix.map(row => [...row]);
    for (let i = 0; i < rotation; i++) {
        // Rotate 90 degrees
        newMatrix = newMatrix[0]!.map((val, index) => newMatrix.map(row => row[index]!).reverse());
    }
    return newMatrix;
}

export function getPieceMatrix(piece: Piece, rotation: 0 | 1 | 2 | 3) {
    const matrix = rotateMatrix(PIECE_MATRICES[piece], rotation);

    return matrix;
}

export function tryWallKicks(board: Block[][], pieceData: PieceData, rotation: 0 | 1 | 2 | 3): { pieceData: PieceData, success: boolean } {
    const newPieceData = { ...pieceData, rotation };
    const wallKicks = newPieceData.piece === 'I' ? I_WALLKICKS : WALLKICKS;

    const kickData = wallKicks[`${pieceData.rotation}-${rotation}`]!;

    for (const [x, y] of kickData) {
        newPieceData.x += x;
        newPieceData.y += y;
        if (!checkCollision(board, newPieceData)) {
            return { pieceData: newPieceData, success: true };
        }
        newPieceData.x -= x;
        newPieceData.y -= y;
    }

    return {
        pieceData: newPieceData,
        success: false,
    };
}


export function checkCollision(board: Block[][], pieceData: PieceData, options: Options = DEFAULT_OPTIONS) {
    const pieceMatrix = getPieceMatrix(pieceData.piece, pieceData.rotation);

    for (let pieceY = 0; pieceY < pieceMatrix.length; pieceY++) {
        for (let pieceX = 0; pieceX < pieceMatrix[0]!.length; pieceX++) {
            const boardX = pieceData.x + pieceX;
            const boardY = pieceData.y - pieceY;
            if (pieceMatrix[pieceY]![pieceX] && (boardX < 0 || boardX >= options.boardWidth || boardY < 0 || board[boardY] && board[boardY]![boardX])) {
                return true;
            }
        }
    }

    return false;
}

export function checkImmobile(board: Block[][], pieceData: PieceData, options: Options = DEFAULT_OPTIONS): boolean {
    // Check collision for up, down, left, right
    if (!checkCollision(board, { ...pieceData, y: pieceData.y - 1 }, options)) {
        return false;
    }
    if (!checkCollision(board, { ...pieceData, y: pieceData.y + 1 }, options)) {
        return false;
    }
    if (!checkCollision(board, { ...pieceData, x: pieceData.x - 1 }, options)) {
        return false;
    }
    if (!checkCollision(board, { ...pieceData, x: pieceData.x + 1 }, options)) {
        return false;
    }
    return true;
}

export function placePiece(board: Block[][], pieceData: PieceData, options: Options = DEFAULT_OPTIONS): Block[][] {
    const pieceMatrix = getPieceMatrix(pieceData.piece, pieceData.rotation);
    const newBoard = board.map(row => [...row]);

    for (let pieceY = 0; pieceY < pieceMatrix.length; pieceY++) {
        for (let pieceX = 0; pieceX < pieceMatrix[0]!.length; pieceX++) {
            const boardX = pieceData.x + pieceX;
            const boardY = pieceData.y - pieceY;
            if (pieceMatrix[pieceY]![pieceX]) {
                while (boardY > newBoard.length - 1) {
                    newBoard.push(new Array(options.boardWidth).fill(null));
                }
                newBoard[boardY]![boardX] = pieceMatrix[pieceY]![pieceX]!;
            }
        }
    }

    return newBoard;
}

export function clearLines(board: Block[][]): { board: Block[][], cleared: number } {
    let cleared = 0;
    let newBoard = board.map(row => [...row]);
    for (let i = newBoard.length - 1; i >= 0; i--) {
        if (newBoard[i]!.every(block => block !== null)) {
            cleared++;
            newBoard.splice(i, 1);
        }
    }
    newBoard = newBoard.filter(row => row.some(block => block !== null));
    return { board: newBoard, cleared };
}

export function checkPc(board: Block[][]): boolean {
    return board.length === 0 || board.every(row => row.every(block => block === null));
}

export function calculateScore(scoreData: {
    pc: boolean;
    linesCleared: number;
    isImmobile: boolean;
    b2b: boolean;
    combo: number;
}, options: Options = DEFAULT_OPTIONS): {
    score: number;
    b2b: boolean;
    combo: number;
    attackName: string | null;
} {
    const { linesCleared, isImmobile, b2b, combo, pc } = scoreData;
    const { attackTable, comboTable } = options;

    let score = 0;
    let isB2bClear = false;

    if (linesCleared === 0) {
        return {
            score: 0,
            b2b,
            combo: 0,
            attackName: null,
        }
    }

    let newCombo = combo + 1;
    let attackName: string | null = null;
    if (isImmobile) {
        isB2bClear = true;
        switch (linesCleared) {
            case 1:
                score += attackTable.ass;
                attackName = 'All-Spin Single';
                break;
            case 2:
                score += attackTable.asd;
                attackName = 'All-Spin Double';
                break;
            case 3:
                score += attackTable.ast;
                attackName = 'All-Spin Triple';
                break;
        }
    } else {
        switch (linesCleared) {
            case 1:
                score += attackTable.single;
                attackName = 'Single';
                isB2bClear = false;
                break;
            case 2:
                score += attackTable.double;
                attackName = 'Double';
                isB2bClear = false;
                break;
            case 3:
                score += attackTable.triple;
                attackName = 'Triple';
                isB2bClear = false;
                break;
            case 4:
                score += attackTable.quad;
                attackName = 'Quad';
                isB2bClear = true;
                break;
        }
    }

    if (b2b && isB2bClear) {
        score += attackTable.b2b;
    }

    if (newCombo > 0) {
        score += comboTable[newCombo]!;
    }

    if (pc) {
        score = attackTable.pc;
        attackName = 'Perfect Clear';
    }

    return {
        score,
        b2b: isB2bClear,
        combo: newCombo,
        attackName,
    }
}

export function renderBoard(board: Block[][]) {
    const renderedBoard = board.map(row => row.map(block => block ? block : ' ').join(''));
    renderedBoard.reverse();
    console.log(renderedBoard.join('\n'));
}