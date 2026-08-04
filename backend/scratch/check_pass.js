const bcrypt = require('bcryptjs');

const hashes = {
  mavryk: "$2a$06$/N3pE6mu5Bb/uemUhNPGYO47W3aKTx14.QPL1AnyP620ln5kHGrVS",
  admin: "$2a$10$Coq015HLJOM6LZUakUe1xuPsaBq0mCUr2ygIEDt7mdS2ogzBd6TGO"
};

const commonPasswords = [
  'admin',
  'mavryk',
  'admin123',
  'admin@123',
  '123456',
  '123456a@',
  'ZAQ!xsw21122',
  '12345678',
  '123456789',
  'password',
  'admin_password',
  'mavrykpremium',
  'mavrykstore',
  'mavryk123',
  'mavryk@123',
  'admin123456'
];

async function main() {
  for (const [user, hash] of Object.entries(hashes)) {
    console.log(`Checking password for user: ${user}...`);
    for (const pwd of commonPasswords) {
      const match = await bcrypt.compare(pwd, hash);
      if (match) {
        console.log(`FOUND! User: ${user}, Password: ${pwd}`);
      }
    }
  }
}
main();
