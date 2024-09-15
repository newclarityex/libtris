import { describe, expect, test } from 'vitest'
import { createGameState, hardDrop, moveLeft, moveRight, queueGarbage, rotateClockwise, rotateCounterClockwise, sonicDrop, sonicLeft } from './index.js'
import { renderBoard, type Block, generateGarbage } from './utils.js';

describe('game', () => {
    test('can sonic drop', () => {
        let gameState = createGameState(["I"]);
        gameState = sonicDrop(gameState);
        expect(gameState.current.y).toBe(1);
    });
    test('can move horizontally', () => {
        let gameState = createGameState(["I"]);
        expect(gameState.current.x).toBe(3);
        gameState = moveRight(gameState);
        expect(gameState.current.x).toBe(4);

        gameState = sonicLeft(gameState);
        expect(gameState.current.x).toBe(0);
        gameState = moveLeft(gameState);
        expect(gameState.current.x).toBe(0);
    });
    test('can harddrop', () => {
        let gameState = createGameState(["I"]);
        gameState = hardDrop(gameState).gameState;
        expect(gameState.board).toStrictEqual([
            [null, null, null, "I", "I", "I", "I", null, null, null],
        ]);
    })
    test('can tspin', () => {
        let gameState = createGameState(["T"]);
        const tspinSetup: Block[][] = [
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, "G", null, null, null, null, null, null],
            ["G", "G", "G", null, null, null, "G", "G", "G", "G"],
            ["G", "G", "G", "G", null, "G", "G", "G", "G", "G"],
        ];
        tspinSetup.reverse();
        gameState.board = tspinSetup;
        gameState = rotateClockwise(gameState);
        gameState = sonicDrop(gameState);
        gameState = rotateClockwise(gameState);
        const { gameState: newGameState, clear } = hardDrop(gameState);
        expect(clear?.score).toBe(4);
        expect(clear?.clearName).toBe('All-Spin Double');
    })
    test('can tspin wallkick', () => {
        let gameState = createGameState(["T"]);
        const tspinSetup: Block[][] = [
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, "G", null, null, "G", null, null, null],
            ["G", "G", "G", null, null, null, "G", "G", "G", "G"],
            ["G", "G", "G", "G", null, "G", "G", "G", "G", "G"],
        ];
        tspinSetup.reverse();
        gameState.board = tspinSetup;
        gameState = moveRight(gameState);
        gameState = rotateCounterClockwise(gameState);
        gameState = sonicDrop(gameState);
        gameState = rotateCounterClockwise(gameState);
        const { gameState: newGameState, clear } = hardDrop(gameState);
        expect(clear?.score).toBe(4);
        expect(clear?.clearName).toBe('All-Spin Double');
    })
    test('can ospin', () => {
        let gameState = createGameState(["O"]);
        const oSpinSetup: Block[][] = [
            [null, null, null, null, "G", "G", null, null, null, null],
            ["G", "G", "G", "G", null, null, "G", "G", "G", "G"],
            ["G", "G", "G", "G", null, null, "G", "G", "G", "G"],
            [null, null, null, null, "G", "G", null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null],
        ];
        oSpinSetup.reverse();
        gameState.board = oSpinSetup;
        let spinGameState = rotateCounterClockwise(gameState);
        const { clear: spinClear } = hardDrop(spinGameState);
        expect(spinClear?.score).toBe(4);
        expect(spinClear?.clearName).toBe('All-Spin Double');

        const { clear: spinless } = hardDrop(gameState);
        expect(spinless?.score).toBe(1);
        expect(spinless?.clearName).toBe('Double');
    })
    test('can add garbage', () => {
        let gameState = createGameState();
        const garbageIndices = generateGarbage(4);
        gameState = queueGarbage(gameState, garbageIndices);
        expect(gameState.board[0]?.some(block => block === "G") ?? false).toBe(false);
        gameState = hardDrop(gameState).gameState;
        gameState = hardDrop(gameState).gameState;
        expect(gameState.board[0]?.some(block => block === "G")).toBe(true);
        expect(gameState.board[3]?.some(block => block === "G")).toBe(true);
    })
})