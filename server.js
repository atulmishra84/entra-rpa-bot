"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rpaEngine_1 = require("./rpaEngine");
const app = (0, express_1.default)();
const PORT = 3000;
app.get('/', (_req, res) => res.send('RPA Bot is live'));
app.post('/run-rpa', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, rpaEngine_1.runRpa)(); // exports from rpaEngine.ts
        res.status(200).send('RPA executed successfully.');
    }
    catch (e) {
        res.status(500).send('RPA failed to execute.');
    }
}));
app.listen(PORT, () => {
    console.log(`🚀 Server started at http://localhost:${PORT}`);
});
