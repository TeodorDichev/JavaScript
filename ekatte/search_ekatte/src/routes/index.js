import { Router } from "express";
import search from "./search.js";

const router = Router();

router.use("/search", search);

export default router;
