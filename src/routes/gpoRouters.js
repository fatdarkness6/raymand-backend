import express from "express";
import { companies } from "../controllers/gpoController";
const router = express.Router();

router.get("/companies", companies);

export default router;
