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
