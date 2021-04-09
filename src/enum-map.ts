import { FxBoundaryPosition, FxNodeCloseType } from "./types";

export const FxBoundaryPositionMap = {
    [FxBoundaryPosition.left]: 1,
    [FxBoundaryPosition.right]: 1,
};

export const FxNodeCloseTypeMap = {
    [FxNodeCloseType.fullClosed]: 1,
    [FxNodeCloseType.notClosed]: 1,
    [FxNodeCloseType.selfCloseing]: 1,
    [FxNodeCloseType.startTagClosed]: 1,
};
