import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";

import User from "../models/User.js";

/* ======================================================
   FACEBOOK LOGIN STRATEGY
   ====================================================== */
/*
  IMPORTANT:
  - This guard prevents Railway crash if env vars are missing
  - Works locally AND in production
*/
if (
  process.env.FACEBOOK_APP_ID &&
  process.env.FACEBOOK_APP_SECRET &&
  process.env.FACEBOOK_CALLBACK_URL
) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
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
} else {
  console.warn("⚠️ Facebook OAuth disabled (missing env variables)");
}

/* ======================================================
   GOOGLE LOGIN STRATEGY (UNCHANGED)
   ====================================================== */
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
) {
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
} else {
  console.warn("⚠️ Google OAuth disabled (missing env variables)");
}

export default passport;