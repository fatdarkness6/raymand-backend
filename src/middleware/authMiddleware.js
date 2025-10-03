import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) return res.status(401).json({ msg: "User not found" });

      next(); // ✅ allow request to continue
    } catch (err) {
      return res.status(401).json({ msg: "Not authorized, invalid token" });
    }
  }

  if (!token) {
    return res.status(401).json({ msg: "Not authorized, no token" });
  }
};
