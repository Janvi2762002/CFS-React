// src/services/AdminService.ts
import axios from "axios";


class AdminService {
  // Note: Use relative URLs for proxy
  // API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
  API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";


  // Fetch all users
  async getUsers() {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/Users`, {
        headers: {
          "Content-Type": "application/json",
          // Add Authorization if needed:
          // "Authorization": `Bearer ${yourToken}`
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  // Fetch single user by ID
  async getUserById(userId) {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/Users/${userId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  }

// update a user
  async saveUser(user) {
    try {
      if (user.id) {
        // Update existing user
        const response = await axios.put(
          `${this.API_BASE_URL}/Users/${user.id}`,
          user,
          { headers: { "Content-Type": "application/json" } }
        );
        return response.data;
    } 
  }
  catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  }

  async updateUser(userId,user) {
    try {
      if (userId) {
        // Update existing user
        const response = await axios.put(
          `${this.API_BASE_URL}/Users/${userId}`,
          user,
          { headers: { "Content-Type": "application/json" } }
        );
        return response.data;
    } 
  }
  catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  }
  // Delete a user
  async deleteUser(userId) {
    try {
      const response = await axios.delete(`${this.API_BASE_URL}/Users/${userId}`, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async getCardInfo() {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/CardInfo`, {
        headers: {
          "Content-Type": "application/json",
          // Add Authorization if needed:
          // "Authorization": `Bearer ${yourToken}`
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  async saveCard(card) {
    try {
        // Update existing user
        const response = await axios.post(
          `${this.API_BASE_URL}/CardInfo`,
          card,
          { headers: { "Content-Type": "application/json" } }
        );
        return response.data;
    } 
  
  catch (error) {
      console.error("Error saving card:", error);
      throw error;
    }
  }

  // update card
  async updateCard(cardId , card) {
    try {
      if (cardId) {
        // Update existing user
        const response = await axios.put(
          `${this.API_BASE_URL}/CardInfo/${cardId}`,
          card,
          { headers: { "Content-Type": "application/json" } }
        );
        return response.data;
    } 
  }
  catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  }
  async deleteCard(cardId) {
    try {
      const response = await axios.delete(`${this.API_BASE_URL}/CardInfo/${cardId}`, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }
}

// Export single instance
const adminService = new AdminService();
export default adminService;


