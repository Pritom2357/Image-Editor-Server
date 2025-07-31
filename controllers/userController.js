const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

class UserController {
  
  static generateTokens(user) {
    const payload = {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      email: user.email
    };
    
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '55m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    return { accessToken, refreshToken };
  }

  static async register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
      }

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const newUser = await UserModel.createUser({
        username,
        email,
        password_hash
      });

      const { accessToken, refreshToken } = UserController.generateTokens(newUser);
      await UserModel.updateRefreshToken(newUser.id, refreshToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          uuid: newUser.uuid,
          username: newUser.username,
          email: newUser.email,
          full_name: newUser.full_name,
          subscription_type: newUser.subscription_type,
          credits_remaining: newUser.credits_remaining
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      console.error('Registration error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const { accessToken, refreshToken } = UserController.generateTokens(user);
      await UserModel.updateRefreshToken(user.id, refreshToken);
      await UserModel.updateLastLogin(user.id);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          subscription_type: user.subscription_type,
          credits_remaining: user.credits_remaining,
          total_credits_used: user.total_credits_used
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  static async logout(req, res) {
    try {
      const userId = req.user.id;
      await UserModel.clearRefreshToken(userId);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const { userId } = req.params;

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          subscription_type: user.subscription_type,
          credits_remaining: user.credits_remaining,
          total_credits_used: user.total_credits_used,
          created_at: user.created_at,
          last_login: user.last_login
        }
      });

    } catch (error) {
      console.error('Get profile error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { userId } = req.params;
      const { full_name, avatar_url } = req.body;

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const updatedUser = await UserModel.updateProfile(userId, {
        full_name,
        avatar_url
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });

    } catch (error) {
      console.error('Update profile error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async checkCredits(req, res) {
    try {
      const { userId } = req.params;

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        credits: {
          remaining: user.credits_remaining,
          total_used: user.total_credits_used,
          subscription_type: user.subscription_type
        }
      });

    } catch (error) {
      console.error('Check credits error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async useCredits(req, res) {
    try {
      const { userId } = req.params;
      const { credits } = req.body;

      const creditsFloat = parseFloat(credits);
      
      if (!credits || isNaN(creditsFloat) || creditsFloat <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credits amount. Must be a positive number.'
        });
      }

      const hasCredits = await UserModel.hasEnoughCredits(userId, creditsFloat);
      if (!hasCredits) {
        return res.status(402).json({
          success: false,
          message: 'Insufficient credits'
        });
      }

      const remainingCredits = await UserModel.updateCredits(userId, creditsFloat);

      res.status(200).json({
        success: true,
        message: 'Credits deducted successfully',
        credits_remaining: remainingCredits
      });

    } catch (error) {
      console.error('Use credits error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getUserByUuid(req, res) {
    try {
      const { uuid } = req.params;

      const user = await UserModel.findByUuid(uuid);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          subscription_type: user.subscription_type,
          credits_remaining: user.credits_remaining
        }
      });

    } catch (error) {
      console.error('Get user by UUID error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getUsage(req, res) {
    try {
      const { uuid } = req.params;

      const usage = await UserModel.getUsage(uuid);

      if (!usage) {
        return res.status(404).json({
          success: false,
          message: 'Usage data not found for this user'
        });
      }

      res.status(200).json({
        success: true,
        usage
      });

    }
    
    catch (error) {
      console.error('Get usage error:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = UserController;