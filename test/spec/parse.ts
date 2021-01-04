import { execCommonParseOptionTestCases } from "../case/options";
import { optionsCases, coreCases } from "../case/parse";
import { execParseTestCase } from "../util";

describe("Parse", () => {
    describe("Options", () => {
        execCommonParseOptionTestCases();
        optionsCases.forEach((ptc) => {
            execParseTestCase(ptc);
        });
    });
    describe("Core", () => {
        coreCases.forEach((ptc) => {
            execParseTestCase(ptc);
        });
    });
});
