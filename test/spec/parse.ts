import { execCommonParseOptionTestCases } from "../case/options";
import { optionsCases, coreCases } from "../case/parse";
import { execParseTestCase } from "../util";

describe("Parse", () => {
    describe("Options", () => {
        describe("basic", () => {
            execCommonParseOptionTestCases();
        });
        for (let optionName in optionsCases) {
            describe(optionName, () => {
                optionsCases[optionName].forEach((ptc) => {
                    execParseTestCase(ptc);
                });
            });
        }
    });
    describe("Core", () => {
        coreCases.forEach((ptc) => {
            execParseTestCase(ptc);
        });
    });
});
