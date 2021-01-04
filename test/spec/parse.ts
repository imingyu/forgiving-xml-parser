import cases from "../parse-cases";
import { execParseTestCase } from "../util";

describe("Parse", () => {
    cases.forEach((ptc) => {
        execParseTestCase(ptc);
    });
});
