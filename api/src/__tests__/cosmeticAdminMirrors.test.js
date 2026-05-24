const fs = require('fs');
const path = require('path');

describe('cosmetic admin route mirrors', () => {
  const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  it('mounts the permissions board under the cosmetic router', () => {
    expect(serverSrc).toMatch(/cosmeticRouter\.use\(['"]\/Permissions['"],\s*permissionsRoutes\)/);
  });

  it('mounts customer balances under the cosmetic router', () => {
    expect(serverSrc).toMatch(/cosmeticRouter\.use\(['"]\/CustomerBalance['"],\s*customerBalanceRoutes\)/);
  });
});
