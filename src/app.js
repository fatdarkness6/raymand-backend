import express from "express";
import cors from "cors";
import contactRoutes from "./routes/contactRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cooperationForm from "./routes/cooperationFormRoutes.js"

const app = express();

app.use(express.json());
app.use(cors());

// Routes
console.log("Mounting authRoutes on /auth");
app.use("/auth", authRoutes);
app.use("/contact", contactRoutes);
app.use("/cooperation-form" , cooperationForm)

export default app;
