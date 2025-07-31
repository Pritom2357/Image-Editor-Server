const { query } = require("../config/database");

class UserModel {
  static async createUsersTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        full_name VARCHAR(100),
        avatar_url TEXT,
        subscription_type VARCHAR(20) DEFAULT 'free',
        credits_remaining DECIMAL(10,2) DEFAULT 10.0,
        total_credits_used DECIMAL(10,2) DEFAULT 0.0,
        refresh_token TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
    `;

    await query(createTableQuery);
    console.log("✅ Users table created/verified");
  }

  static async createUser(userData) {
    const { username, email, password_hash, full_name, avatar_url } = userData;

    const insertQuery = `
      INSERT INTO users (username, email, password_hash, full_name, avatar_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, uuid, username, email, full_name, avatar_url, subscription_type, credits_remaining, created_at
    `;

    const result = await query(insertQuery, [
      username,
      email,
      password_hash,
      full_name || null,
      avatar_url || null,
    ]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const selectQuery = `
      SELECT id, uuid, username, email, password_hash, full_name, avatar_url, 
             subscription_type, credits_remaining, total_credits_used, 
             refresh_token, created_at, updated_at, last_login, is_active
      FROM users 
      WHERE email = $1 AND is_active = true
    `;

    const result = await query(selectQuery, [email]);
    return result.rows[0] || null;
  }

  static async findById(userId) {
    const selectQuery = `
      SELECT id, uuid, username, email, full_name, avatar_url, 
             subscription_type, credits_remaining, total_credits_used, 
             created_at, updated_at, last_login, is_active
      FROM users 
      WHERE id = $1 AND is_active = true
    `;

    const result = await query(selectQuery, [userId]);
    return result.rows[0] || null;
  }

  static async findByUuid(uuid) {
    const selectQuery = `
      SELECT id, uuid, username, email, full_name, avatar_url, 
             subscription_type, credits_remaining, total_credits_used, 
             created_at, updated_at, last_login, is_active
      FROM users 
      WHERE uuid = $1 AND is_active = true
    `;

    const result = await query(selectQuery, [uuid]);
    return result.rows[0] || null;
  }

  static async updateLastLogin(userId) {
    const updateQuery = `
      UPDATE users 
      SET last_login = NOW(), updated_at = NOW()
      WHERE id = $1
    `;

    await query(updateQuery, [userId]);
  }

  static async updateRefreshToken(userId, refreshToken) {
    const updateQuery = `
      UPDATE users 
      SET refresh_token = $2, updated_at = NOW()
      WHERE id = $1
    `;

    await query(updateQuery, [userId, refreshToken]);
  }

  static async findByRefreshToken(refreshToken) {
    const selectQuery = `
      SELECT id, uuid, username, email, full_name, avatar_url, 
             subscription_type, credits_remaining, total_credits_used
      FROM users 
      WHERE refresh_token = $1 AND is_active = true
    `;

    const result = await query(selectQuery, [refreshToken]);
    return result.rows[0] || null;
  }

  static async clearRefreshToken(userId) {
    const updateQuery = `
      UPDATE users 
      SET refresh_token = NULL, updated_at = NOW()
      WHERE id = $1
    `;

    await query(updateQuery, [userId]);
  }

  static async updateCredits(userId, creditsUsed) {
    const updateQuery = `
      UPDATE users 
      SET credits_remaining = credits_remaining - $2::DECIMAL,
          total_credits_used = total_credits_used + $2::DECIMAL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING credits_remaining
    `;

    const result = await query(updateQuery, [userId, parseFloat(creditsUsed)]);
    return parseFloat(result.rows[0]?.credits_remaining) || 0;
  }

  static async hasEnoughCredits(userId, requiredCredits = 1) {
    const selectQuery = `
      SELECT credits_remaining 
      FROM users 
      WHERE id = $1
    `;

    const result = await query(selectQuery, [userId]);
    const user = result.rows[0];

    return (
      user && parseFloat(user.credits_remaining) >= parseFloat(requiredCredits)
    );
  }

  static async updateProfile(userId, updateData) {
    const { full_name, avatar_url } = updateData;
    const updateQuery = `
      UPDATE users 
      SET full_name = COALESCE($2, full_name),
          avatar_url = COALESCE($3, avatar_url),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, uuid, username, email, full_name, avatar_url
    `;

    const result = await query(updateQuery, [userId, full_name, avatar_url]);
    return result.rows[0];
  }

  static async initializeTables() {
    try {
      await this.createUsersTable();
      console.log("✅ User tables initialized");
    }
    
    catch (error) {
      console.error("❌ Error initializing user tables:", error.message);
      throw error;
    }
  }

  static async getUsage(uuid) {
    console.log(uuid);
    
    const usageQuery = `
      SELECT
        api_limit AS total_images,
        api_limit - api_usage AS remaining_images,
        api_usage AS generated_images
      FROM
        subscriptions WHERE uuid = $1
    `;

    const result = await query(usageQuery, [uuid]);
    console.log("Usage result:", result.rows[0]);
    
    return result.rows[0];
  }
}

UserModel.initializeTables().catch(console.error);

module.exports = UserModel;
