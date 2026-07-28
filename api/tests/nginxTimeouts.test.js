const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const confFiles = ['nginx.conf', 'nginx.docker.conf'];

describe('INV-019 nginx /api proxy timeouts', () => {
  for (const fileName of confFiles) {
    describe(fileName, () => {
      let apiBlock;

      beforeAll(() => {
        const content = fs.readFileSync(path.join(repoRoot, fileName), 'utf8');
        const match = content.match(/location\s+\/api\s*\{[\s\S]*?\n\s*\}/);
        expect(match).not.toBeNull();
        apiBlock = match[0];
      });

      it('sets proxy_read_timeout to 300s on /api', () => {
        expect(apiBlock).toMatch(/proxy_read_timeout\s+300s\s*;/);
      });

      it('sets proxy_send_timeout to 300s on /api', () => {
        expect(apiBlock).toMatch(/proxy_send_timeout\s+300s\s*;/);
      });

      it('sets send_timeout to 300s on /api', () => {
        expect(apiBlock).toMatch(/send_timeout\s+300s\s*;/);
      });
    });
  }
});
