import { optionsCases, coreCases } from "../case/serialize";
import { execParseTestCase } from "../util";

describe("serialize", () => {
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
