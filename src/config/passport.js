import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";

import User from "../models/User.js";

/* ======================================================
   FACEBOOK LOGIN STRATEGY
   ====================================================== */
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ["id", "displayName", "photos", "email"]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // ✅ Facebook may NOT return email
        const email =
          profile.emails?.[0]?.value ||
          `${profile.id}@facebook.local`;

        let user = await User.findOne({ email });

        // 🔒 Block suspended users
        if (user && user.status === "suspended") {
          return done(null, false);
        }

        // 🆕 Create user if not exists
        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            provider: "facebook",
            avatar: profile.photos?.[0]?.value || null,
            status: "active",
            isVerified: true
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

/* ======================================================
   GOOGLE LOGIN STRATEGY (UNCHANGED)
   ====================================================== */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        let user = await User.findOne({ email });

        // 🔒 Block suspended users
        if (user && user.status === "suspended") {
          return done(null, false, {
            message: "Account suspended"
          });
        }

        // 🆕 Create user if not exists
        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            provider: "google",
            status: "active",
            isVerified: true
          });
          
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
