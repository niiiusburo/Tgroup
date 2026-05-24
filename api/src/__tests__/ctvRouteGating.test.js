const fs = require('fs');
const path = require('path');

describe('CTV dashboard route gating', () => {
  it('does not remount CTV routes without the dashboard permission gate', () => {
    const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

    expect(serverSource).toContain("app.use('/api/ctv', requirePermission('ctv.dashboard.view'), ctvRoutes)");
    expect(serverSource).not.toContain("app.use('/api/ctv', ctvRoutes);");
  });

  it('requires is_ctv for self-dashboard read endpoints', () => {
    const ctvSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'ctv.js'), 'utf8');

    expect(ctvSource).toContain('function requireCtvUser');
    expect(ctvSource).toContain("router.get('/commission-summary', requireAuth, requireCtvUser");
    expect(ctvSource).toContain("router.get('/referrals', requireAuth, requireCtvUser");
    expect(ctvSource).toContain("router.get('/me', requireAuth, requireCtvUser");
  });
});
