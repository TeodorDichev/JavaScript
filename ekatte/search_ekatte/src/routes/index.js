import { Router } from "express";
import searchRouter from "./search.js";

const router = Router();

router.use("/search", searchRouter);

export default router;
