const { db } = require("@/db");

const orderCodes = [
  "MAVKCA2HC",
  "MAVKHD2S5",
  "MAVK6G6K2",
  "MAVK7MN92",
  "MAVKPCV8A",
  "MAVK7M5CG",
  "MAVKG5GWK",
  "MAVK52ZRY",
  "MAVKRFT55",
  "MAVKGZ2HQ",
  "MAVKW88X7",
  "MAVKBD8RL",
  "MAVN954U5",
  "MAVKEJZM8",
  "MAVNLZUDR",
  "MAVK3AX6A"
];

async function queryOrders() {
  try {
    console.log("Mã Đơn\t\tThông Tin (Account/Email)\tKhách Hàng\tTrạng Thái\tHạn Sử Dụng");
    console.log("=".repeat(100));

    for (const code of orderCodes) {
      const orders = await db.raw(`
        SELECT id_order, information_order, customer, status, expired_at, order_date 
        FROM business.order_list 
        WHERE id_order = ? OR id_order ILIKE ?
      `, [code, `%${code}%`]);

      if (orders.rows && orders.rows.length > 0) {
        for (const row of orders.rows) {
          console.log(`${row.id_order}\t${row.information_order || "N/A"}\t\t${row.customer || "N/A"}\t${row.status || "N/A"}\t${row.expired_at || "N/A"}`);
        }
      } else {
        console.log(`${code}\tKHÔNG TÌM THẤY TRONG HỆ THỐNG`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error querying orders:", err);
    process.exit(1);
  }
}

queryOrders();
