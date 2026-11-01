const assert = require('assert');
const { matchBankGateway } = require('../../src/domains/wallets/services/walletService');

console.log('=== TEST SUITE: matchBankGateway ===');

// 1. Test MBBank khớp MB Bank Shop
const mbAccount = {
  bank_short_code: 'MB',
  label: 'MB Bank',
  bank_display_name: 'Ngân hàng TMCP Quân đội',
};

assert.strictEqual(matchBankGateway('MBBank', mbAccount), true, 'MBBank must match MB account');
assert.strictEqual(matchBankGateway('MBBANK', mbAccount), true, 'MBBANK must match MB account');
assert.strictEqual(matchBankGateway('MB', mbAccount), true, 'MB must match MB account');

// 2. Test MBBank KHÔNG ĐƯỢC khớp VPBank Cá nhân
const vpbAccount = {
  bank_short_code: 'VPB',
  label: 'Tài khoản cá nhân',
  bank_display_name: 'VPBank (VPB)',
};

assert.strictEqual(matchBankGateway('MBBank', vpbAccount), false, 'MBBank must NOT match VPB account');
assert.strictEqual(matchBankGateway('MB', vpbAccount), false, 'MB must NOT match VPB account');

// 3. Test VPBank khớp VPBank Cá nhân
assert.strictEqual(matchBankGateway('VPBank', vpbAccount), true, 'VPBank must match VPB account');
assert.strictEqual(matchBankGateway('VPB', vpbAccount), true, 'VPB must match VPB account');

// 4. Test TPBank
const tpbAccount = {
  bank_short_code: 'TPB',
  label: 'TP Bank',
  bank_display_name: 'Ngân hàng TMCP Tiên Phong',
};
assert.strictEqual(matchBankGateway('TPBank', tpbAccount), true, 'TPBank must match TPB account');
assert.strictEqual(matchBankGateway('TPBank', mbAccount), false, 'TPBank must NOT match MB account');

console.log('✅ ALL TESTS PASSED FOR matchBankGateway!');
