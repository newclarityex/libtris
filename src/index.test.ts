import { describe, expect, test } from 'vitest'
import { createGameState, hardDrop, moveLeft, moveRight, queueGarbage, rotateClockwise, rotateCounterClockwise, sonicDrop, sonicLeft } from './index'
import { renderBoard, type Block, generateGarbage } from './utils';

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
        const { gameState: newGameState, score, clear } = hardDrop(gameState);
        expect(score).toBe(4);
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
        const { gameState: newGameState, score, clear } = hardDrop(gameState);
        expect(score).toBe(4);
        expect(clear?.clearName).toBe('All-Spin Double');
    })
    test('can add garbage', () => {
        let gameState = createGameState();
        const garbageIndices = generateGarbage(4);
        gameState = queueGarbage(gameState, garbageIndices);
        expect(gameState.board[0]?.some(block => block === "G") ?? false).toBe(false);
        gameState = hardDrop(gameState).gameState;
        expect(gameState.board[0]?.some(block => block === "G")).toBe(true);
        expect(gameState.board[3]?.some(block => block === "G")).toBe(true);
    })
})