const express = require('express');
const router = express.Router();
const passport = require('../config/oauth');
const UserController = require('../controllers/userController');
const UserModel = require('../models/userModel');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

router.get('/google',
    passport.authenticate('google', {scope: ['profile', 'email']})
);

router.get('/google/callback', 
    (req, res, next) => {
      // Use the stored redirect URI from the session
      const redirectUri = req.session.redirectUri || process.env.DEFAULT_REDIRECT_URI;
      
      // Configure passport with the dynamic redirect
      passport.authenticate('google', {
        failureRedirect: `${redirectUri}/login?error=oauth_failed`
      })(req, res, next);
    },
    async (req, res) => {
        try {
            const {accessToken, refreshToken}= UserController.generateTokens(req.user);
            await UserModel.updateRefreshToken(req.user.id, refreshToken);

            // Check if request is from a popup window
            const isPopup = req.query.popup === 'true';
            
            if (isPopup) {
                // Return HTML with postMessage for popup flow
                return res.send(`
                    <html>
                    <body>
                        <script>
                            try {
                                window.opener.postMessage({
                                    type: 'google-auth-success',
                                    token: '${accessToken}',
                                    refreshToken: '${refreshToken}',
                                    user: ${JSON.stringify({
                                        id: req.user.id,
                                        uuid: req.user.uuid,
                                        username: req.user.username,
                                        email: req.user.email,
                                        full_name: req.user.full_name,
                                        avatar_url: req.user.avatar_url,
                                        subscription_type: req.user.subscription_type,
                                        credits_remaining: req.user.credits_remaining
                                    })}
                                }, '*');
                                document.write('Authentication successful. You can close this window.');
                                window.close();
                            } catch (e) {
                                document.write('Authentication successful, but could not communicate with the opener. Please close this window manually.');
                            }
                        </script>
                        <p>Authentication successful. You can close this window.</p>
                    </body>
                    </html>
                `);
            }

            // Default redirect flow for non-popup requests
            const redirectUri = req.session.redirectUri || process.env.DEFAULT_REDIRECT_URI;
            res.redirect(`${redirectUri}/auth/success?token=${accessToken}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
                id: req.user.id,
                uuid: req.user.uuid,
                username: req.user.username,
                email: req.user.email,
                full_name: req.user.full_name,
                avatar_url: req.user.avatar_url,
                subscription_type: req.user.subscription_type,
                credits_remaining: req.user.credits_remaining
            }))}`);
        } catch (error) {
            console.error('OAuth callback error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'https://ai-image-editor-client.onrender.com';
            res.redirect(`${frontendUrl}/login?error=oauth_failed`);
        }
    }
);

module.exports = router;