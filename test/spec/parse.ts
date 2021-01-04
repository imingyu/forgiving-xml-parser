import { optionsCases, coreCases } from "../case/parse";
import { execParseTestCase } from "../util";

describe("Parse", () => {
    describe("Options", () => {
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
