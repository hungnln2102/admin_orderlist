require('module-alias/register');
const { db } = require('@/db');
const { updateDatabaseTask } = require('@/scheduler/taskInstances');
const { STATUS } = require('@/utils/statuses');

async function runTest() {
  console.log("Starting DB simulation test for MAVN orders...");
  
  // Clean up any potential stale test orders first
  await db('business.order_list').whereLike('id_order', 'TEST%').delete();
  
  const today = new Date();
  const formatYMD = (date) => date.toISOString().split('T')[0];
  
  const dateIn2Days = new Date();
  dateIn2Days.setDate(today.getDate() + 2);
  
  const datePast = new Date();
  datePast.setDate(today.getDate() - 1);
  
  const testRows = [
    {
      id_order: 'TEST_MAVN01',
      order_date: formatYMD(today),
      days: '30',
      expired_at: formatYMD(dateIn2Days),
      status: STATUS.PAID,
      customer: 'Test MAVN Customer',
      contact: '123'
    },
    {
      id_order: 'TEST_MAVT01',
      order_date: formatYMD(today),
      days: '30',
      expired_at: formatYMD(dateIn2Days),
      status: STATUS.PAID,
      customer: 'Test MAVT Customer',
      contact: '123'
    },
    {
      id_order: 'TEST_RETAIL01',
      order_date: formatYMD(today),
      days: '30',
      expired_at: formatYMD(dateIn2Days),
      status: STATUS.PAID,
      customer: 'Test Retail Customer',
      contact: '123'
    },
    {
      id_order: 'TEST_MAVN02',
      order_date: formatYMD(today),
      days: '30',
      expired_at: formatYMD(datePast),
      status: STATUS.PAID,
      customer: 'Test Expired Customer',
      contact: '123'
    }
  ];
  
  console.log("Inserting test orders...");
  await db('business.order_list').insert(testRows);
  
  try {
    console.log("Running updateDatabaseTask...");
    await updateDatabaseTask('manual');
    
    console.log("Verifying results...");
    const results = await db('business.order_list')
      .whereLike('id_order', 'TEST%')
      .select('id_order', 'status');
      
    console.log("Results from DB:", results);
    
    const mavn01 = results.find(r => r.id_order === 'TEST_MAVN01');
    const mavt01 = results.find(r => r.id_order === 'TEST_MAVT01');
    const retail01 = results.find(r => r.id_order === 'TEST_RETAIL01');
    const mavn02 = results.find(r => r.id_order === 'TEST_MAVN02');
    
    let success = true;
    if (!mavn01 || mavn01.status !== STATUS.RENEWAL) {
      console.error("FAIL: TEST_MAVN01 did not transition to RENEWAL! Status is:", mavn01?.status);
      success = false;
    }
    if (!mavt01 || mavt01.status !== STATUS.RENEWAL) {
      console.error("FAIL: TEST_MAVT01 did not transition to RENEWAL! Status is:", mavt01?.status);
      success = false;
    }
    if (!retail01 || retail01.status !== STATUS.RENEWAL) {
      console.error("FAIL: TEST_RETAIL01 did not transition to RENEWAL! Status is:", retail01?.status);
      success = false;
    }
    if (!mavn02 || mavn02.status !== STATUS.EXPIRED) {
      console.error("FAIL: TEST_MAVN02 did not transition to EXPIRED! Status is:", mavn02?.status);
      success = false;
    }
    
    if (success) {
      console.log("SUCCESS: All transitions occurred exactly as expected!");
    }
  } finally {
    console.log("Cleaning up test data...");
    await db('business.order_list').whereLike('id_order', 'TEST%').delete();
    console.log("Cleaned up.");
  }
}

runTest().then(() => {
  process.exit(0);
}).catch(err => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
