import { assert } from "chai";
import { execPlaceholderParseCases } from "../util";
export const execCommonParseOptionTestCases = () => {
    it("Empty options", () => {
        execPlaceholderParseCases();
    });
    it("Options not object", () => {
        execPlaceholderParseCases(3);
        execPlaceholderParseCases(true);
        execPlaceholderParseCases("test");
        execPlaceholderParseCases(() => {});
    });
    it("Options not plain object", () => {
        execPlaceholderParseCases(new Error("test"));
        execPlaceholderParseCases(/a/);
        execPlaceholderParseCases(new Date());
        function T() {
            this.name = "test";
        }
        execPlaceholderParseCases(new T());
    });
    it("Ignore not support option", () => {
        let mark;
        execPlaceholderParseCases({
            abc: true,
            on() {
                mark = 1;
            },
        });
        assert.equal(mark, undefined);
    });
};
