"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Enumeration of migration statuses
 */
var Status;
(function (Status) {
    Status[Status["DELETED"] = -1] = "DELETED";
    Status[Status["PENDING"] = 0] = "PENDING";
    Status[Status["FAILED"] = 1] = "FAILED";
    Status[Status["COMPLETED"] = 2] = "COMPLETED";
})(Status = exports.Status || (exports.Status = {}));
