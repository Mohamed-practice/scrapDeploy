const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage for development
let orders = [];
let orderCounter = 1;

// Demo users for authentication
const users = [
  {
    id: 1,
    username: 'John Doe',
    mobile: '9876543210',
    password: 'password123',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date()
  },
  {
    id: 2,
    username: 'Admin User',
    mobile: '9999999999',
    password: 'admin123',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date()
  }
];

const initialPrices = [
  { id: 1, scrapType: 'Copper', price: 650, unit: 'kg', lastUpdated: new Date() },
  { id: 2, scrapType: 'Iron', price: 30, unit: 'kg', lastUpdated: new Date() },
  { id: 3, scrapType: 'Aluminum', price: 140, unit: 'kg', lastUpdated: new Date() },
  { id: 4, scrapType: 'Steel', price: 35, unit: 'kg', lastUpdated: new Date() },
  { id: 5, scrapType: 'Brass', price: 350, unit: 'kg', lastUpdated: new Date() },
  { id: 6, scrapType: 'Paper', price: 8, unit: 'kg', lastUpdated: new Date() },
  { id: 7, scrapType: 'Plastic', price: 12, unit: 'kg', lastUpdated: new Date() }
];

let prices = [...initialPrices];

// Helper functions
const generateOrderId = () => {
  return `SC${String(orderCounter++).padStart(6, '0')}`;
};

const validateMobile = (mobile) => {
  return /^[6-9]\d{9}$/.test(mobile);
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Scrap Connect API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Scrap Connect API is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== AUTH ENDPOINTS ====================

// Register new user
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, mobile, password } = req.body;

    if (!username || !mobile || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, mobile number, and password are required'
      });
    }

    if (!validateMobile(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number format'
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.mobile === mobile);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this mobile number already exists'
      });
    }

    // Create new user
    const newUser = {
      id: users.length + 1,
      username: username.trim(),
      mobile: mobile.trim(),
      password: password,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    users.push(newUser);

    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = newUser;

    console.log('Registration successful for:', newUser.username);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Login user
app.post('/api/auth/login', (req, res) => {
  try {
    const { mobile, password } = req.body;

    console.log('Login attempt:', { mobile, password: '***' });

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number and password are required'
      });
    }

    if (!validateMobile(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number format'
      });
    }

    const user = users.find(u => u.mobile === mobile && u.password === password);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid mobile number or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();

    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user;

    console.log('Login successful for:', user.username);

    res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user profile
app.get('/api/auth/profile/:mobile', (req, res) => {
  try {
    const mobile = req.params.mobile;

    if (!validateMobile(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number format'
      });
    }

    const user = users.find(u => u.mobile === mobile);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ==================== ORDER ENDPOINTS ====================

// Create scrap pickup request
app.post('/api/orders', (req, res) => {
  try {
    const { scrapType, weight, mobile, description, address } = req.body;

    // Validation
    if (!scrapType || !weight || !mobile) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: scrapType, weight, mobile'
      });
    }

    if (!validateMobile(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number. Must be 10 digits starting with 6-9'
      });
    }

    if (isNaN(weight) || weight <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Weight must be a positive number'
      });
    }

    const newOrder = {
      orderId: generateOrderId(),
      scrapType: scrapType.trim(),
      weight: parseFloat(weight),
      mobile: mobile.trim(),
      description: description ? description.trim() : '',
      address: address ? address.trim() : '',
      status: 'Open',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    orders.push(newOrder);

    console.log(`📦 New order created: ${newOrder.orderId} for ${newOrder.mobile}`);

    res.status(201).json({
      success: true,
      message: 'Pickup request created successfully',
      order: newOrder
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get orders by mobile number
app.get('/api/orders/:mobile', (req, res) => {
  try {
    const mobile = req.params.mobile;

    if (!validateMobile(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number format'
      });
    }

    const userOrders = orders.filter(order => order.mobile === mobile);

    res.json({
      success: true,
      count: userOrders.length,
      orders: userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all orders (admin endpoint)
app.get('/api/orders', (req, res) => {
  try {
    res.json({
      success: true,
      count: orders.length,
      orders: orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ==================== PRICE ENDPOINTS ====================

// Get current market prices
app.get('/api/prices', (req, res) => {
  try {
    res.json({
      success: true,
      count: prices.length,
      prices: prices.sort((a, b) => b.price - a.price),
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update market prices
app.post('/api/prices', (req, res) => {
  try {
    const { scrapType, price } = req.body;

    if (!scrapType || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: scrapType, price'
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a positive number'
      });
    }

    const existingPriceIndex = prices.findIndex(p => 
      p.scrapType.toLowerCase() === scrapType.toLowerCase()
    );

    if (existingPriceIndex !== -1) {
      // Update existing price
      prices[existingPriceIndex].price = parseFloat(price);
      prices[existingPriceIndex].lastUpdated = new Date();
      
      res.json({
        success: true,
        message: `Price updated for ${scrapType}`,
        updatedPrice: prices[existingPriceIndex]
      });
    } else {
      // Add new price
      const newPrice = {
        id: prices.length + 1,
        scrapType: scrapType.trim(),
        price: parseFloat(price),
        unit: 'kg',
        lastUpdated: new Date()
      };
      
      prices.push(newPrice);
      
      res.json({
        success: true,
        message: `New price added for ${scrapType}`,
        updatedPrice: newPrice
      });
    }

  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update order status
app.put('/api/orders/:orderId/status', (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body;

    const validStatuses = ['Open', 'In Progress', 'Completed', 'Cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const orderIndex = orders.findIndex(order => order.orderId === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date();

    console.log(`📋 Order ${orderId} status updated to: ${status}`);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: orders[orderIndex]
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Get all users (admin endpoint)
app.get('/api/admin/users', (req, res) => {
  try {
    // Return users without passwords
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);

    res.json({
      success: true,
      count: usersWithoutPasswords.length,
      users: usersWithoutPasswords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get admin statistics
// Add this after the existing order endpoints, before the PRICE ENDPOINTS section

// Delete order (admin endpoint)
app.delete('/api/orders/:orderId', (req, res) => {
  try {
    const orderId = req.params.orderId;

    const orderIndex = orders.findIndex(order => order.orderId === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const deletedOrder = orders[orderIndex];
    orders.splice(orderIndex, 1);

    console.log(`🗑️ Order ${orderId} deleted by admin`);

    res.json({
      success: true,
      message: 'Order deleted successfully',
      deletedOrder: deletedOrder
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get admin statistics NewRand007## qBr$!5vfBscxCgu
app.get('/api/admin/stats', (req, res) => {
  try {
    const totalUsers = users.length;
    const totalOrders = orders.length;
    const openOrders = orders.filter(order => order.status === 'Open').length;
    const inProgressOrders = orders.filter(order => order.status === 'In Progress').length;
    const completedOrders = orders.filter(order => order.status === 'Completed').length;
    const cancelledOrders = orders.filter(order => order.status === 'Cancelled').length;
    const totalWeight = orders.reduce((sum, order) => sum + order.weight, 0);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Get actual recent orders array (limit to 5 for display)
    const recentOrdersArray = orders
      .filter(order => new Date(order.createdAt) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(order => {
        const user = users.find(u => u.mobile === order.mobile);
        return {
          ...order,
          username: user ? user.username : 'Unknown User'
        };
      });

    const recentUsersArray = users
      .filter(user => new Date(user.createdAt) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(({ password, ...user }) => user); // Remove password

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        openOrders,
        inProgressOrders,
        completedOrders,
        cancelledOrders,
        totalWeight: Math.round(totalWeight * 100) / 100,
        recentOrders: recentOrdersArray,
        recentUsers: recentUsersArray,
        priceCount: prices.length,
        ordersByStatus: {
          open: openOrders,
          inProgress: inProgressOrders,
          completed: completedOrders,
          cancelled: cancelledOrders
        }
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Scrap Connect API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/register`);
  console.log(`   GET  /api/auth/profile/:mobile`);
  console.log(`   POST /api/orders`);
  console.log(`   GET  /api/orders/:mobile`);
  console.log(`   GET  /api/orders`);
  console.log(`   GET  /api/prices`);
  console.log(`   POST /api/prices`);
  console.log(`   PUT  /api/orders/:orderId/status`);
  console.log(`\n💡 Demo accounts:`);
  console.log(`   Regular User: 9876543210 / password123`);
  console.log(`   Admin User: 9999999999 / admin123`);
  console.log(`\n💡 Ready to accept requests!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});