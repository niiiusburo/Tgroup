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
    // ctv.js was split into routes/ctv/ sub-modules (commission.js, clients.js,
    // bookings.js, network.js, profile.js) + a shared helpers module. The gating
    // invariants below are checked against the corresponding split file.
    const sharedSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'ctv', '_shared.js'), 'utf8');
    const commissionSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'ctv', 'commission.js'), 'utf8');
    const clientsSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'ctv', 'clients.js'), 'utf8');
    const ctvProfileSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'ctvProfile.js'), 'utf8');

    expect(sharedSource).toContain('function requireCtvUser');
    expect(commissionSource).toContain("router.get('/commission-summary', requireAuth, requireCtvUser");
    expect(clientsSource).toContain("router.get('/referrals', requireAuth, requireCtvUser");
    // GET /me is owned exclusively by ctvProfileRoutes (mounted first). No ctv/
    // sub-module may also define /me, or the two collide and the second is dead code.
    expect(commissionSource).not.toContain("router.get('/me'");
    expect(clientsSource).not.toContain("router.get('/me'");
    expect(ctvProfileSource).toContain('function requireCtvSelf');
    expect(ctvProfileSource).toContain("router.get('/me', requireAuth, requireCtvSelf");
    expect(ctvProfileSource).toContain("router.patch('/me', requireAuth, requireCtvSelf");
    expect(ctvProfileSource).toContain("router.post('/me/password', requireAuth, requireCtvSelf");
  });
});
