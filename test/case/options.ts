import { assert } from "chai";
import { parse } from "../../src";
import { execPlaceholderParseCases } from "../util";
export const execCommonParseOptionTestCases = () => {
    it("Ignore not support option", () => {
        let mark;
        execPlaceholderParseCases({
            trim: true,
            on() {
                mark = 1;
            },
        });
        assert.equal(mark, undefined);
    });
};
