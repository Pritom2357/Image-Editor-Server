const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');

passport.serializeUser((user, done)=>{
    done(null, user.id);
});

passport.deserializeUser(async(id, done)=>{
    try {
        const user = await UserModel.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null); 
    }
});

if(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET){
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'https://ai-image-editor-server.onrender.com/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done)=>{
        try {
            let user = await UserModel.findByEmail(profile.emails[0].value);

            if(user){
                await UserModel.updateLastLogin(user.id);
                return done(null, user);
            }

            const username = profile.displayName?.replace(/\s+/g, '_').toLowerCase() || 
                           profile.emails[0].value.split('@')[0];

            const randomPassword = require('crypto').randomBytes(32).toString('hex');
            const password_hash = await bcrypt.hash(randomPassword, 10);


            const newUser = await UserModel.createUser({
                username: username,
                email: profile.emails[0].value,
                password_hash: password_hash
            });

            if (profile.displayName || profile.photos[0]?.value) {
                await UserModel.updateProfile(newUser.id, {
                    full_name: profile.displayName,
                    avatar_url: profile.photos[0]?.value
                });
            }

            const updatedUser = await UserModel.findById(newUser.id);
            done(null, updatedUser);
        } catch (error) {
            console.error('Google OAuth error:', error);
            done(error, null);
        }
    }));
}

module.exports = passport;