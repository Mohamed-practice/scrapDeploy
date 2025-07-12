// Simple API test script
const testAPI = async () => {
  const baseURL = 'http://localhost:5000';
  
  try {
    console.log('🧪 Testing Scrap Connect API...\n');
    
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseURL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    
    // Test 2: Get prices
    console.log('\n2. Testing prices endpoint...');
    const pricesResponse = await fetch(`${baseURL}/api/prices`);
    const pricesData = await pricesResponse.json();
    console.log('✅ Prices loaded:', pricesData.count, 'items');
    
    // Test 3: Create order
    console.log('\n3. Testing create order...');
    const orderData = {
      scrapType: 'Copper',
      weight: 25,
      mobile: '9876543210',
      description: 'Test order from API test',
      address: '123 Test Street'
    };
    
    const createResponse = await fetch(`${baseURL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    const createData = await createResponse.json();
    console.log('✅ Order created:', createData.order?.orderId);
    
    // Test 4: Get orders by mobile
    console.log('\n4. Testing get orders by mobile...');
    const ordersResponse = await fetch(`${baseURL}/api/orders/9876543210`);
    const ordersData = await ordersResponse.json();
    console.log('✅ Orders fetched:', ordersData.count, 'orders');
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run tests if server is running
testAPI();