const fs = require('fs');
const path = require('path');

describe('NK3 live browser origins', () => {
  it('allows the TMV/NK3 origins used by live browser verification', () => {
    const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

    expect(serverSource).toContain("'https://76-13-16-68.sslip.io'");
    expect(serverSource).toContain("'https://tmv.2checkin.com'");
    expect(serverSource).not.toContain("'https://ctv.2checkin.com'");
    expect(serverSource).not.toContain("'https://www.ctv.2checkin.com'");
  });
});
