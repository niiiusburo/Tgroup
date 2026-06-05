const fs = require('fs');
const path = require('path');

describe('CTV dashboard route gating', () => {
  it('does not remount CTV routes without the dashboard permission gate', () => {
    const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const profileMount = "app.use('/api/ctv', requirePermission('ctv.dashboard.view'), ctvProfileRoutes)";
    const dashboardMount = "app.use('/api/ctv', requirePermission('ctv.dashboard.view'), ctvRoutes)";

    expect(serverSource).toContain(profileMount);
    expect(serverSource).toContain(dashboardMount);
    expect(serverSource).not.toContain("app.use('/api/ctv', ctvRoutes);");
    expect(serverSource.indexOf(profileMount)).toBeLessThan(serverSource.indexOf(dashboardMount));
  });

  it('requires is_ctv for self-dashboard read endpoints', () => {
    const ctvSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'ctv.js'), 'utf8');
    const ctvProfileSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'ctvProfile.js'), 'utf8');

    expect(ctvSource).toContain('function requireCtvUser');
    expect(ctvSource).toContain("router.get('/commission-summary', requireAuth, requireCtvUser");
    expect(ctvSource).toContain("router.get('/referrals', requireAuth, requireCtvUser");
    // GET /me is owned exclusively by ctvProfileRoutes (mounted first). ctv.js must
    // NOT also define /me, or the two collide and the second is dead code.
    expect(ctvSource).not.toContain("router.get('/me'");
    expect(ctvProfileSource).toContain('function requireCtvSelf');
    expect(ctvProfileSource).toContain("router.get('/me', requireAuth, requireCtvSelf");
    expect(ctvProfileSource).toContain("router.patch('/me', requireAuth, requireCtvSelf");
    expect(ctvProfileSource).toContain("router.post('/me/password', requireAuth, requireCtvSelf");
  });
});
