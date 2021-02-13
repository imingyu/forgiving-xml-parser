import { parse } from "../../src";
import { execCommonParseOptionTestCases } from "../case/options";
import { optionsCases, coreCases } from "../case/parse";
import { testCases } from "../util";

describe("Parse", () => {
    describe("Options", () => {
        describe("*", () => {
            execCommonParseOptionTestCases();
        });
        testCases(optionsCases, parse);
    });
    describe("Core", () => {
        testCases(coreCases, parse);
    });
});
