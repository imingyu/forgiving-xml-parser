import { parse } from "../../src";
import { execCommonParseOptionTestCases } from "../case/options";
import * as optionsCases from "../case/parse-options";
import * as coreCases from "../case/parse-core";
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
