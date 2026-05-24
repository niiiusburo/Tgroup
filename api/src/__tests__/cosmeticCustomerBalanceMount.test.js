const fs = require('fs');
const path = require('path');

describe('cosmetic route mirrors', () => {
  it('mounts request-scoped cosmetic mirrors used by TMV workflows', () => {
    const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

    [
      "cosmeticRouter.use('/CustomerBalance', customerBalanceRoutes)",
      "cosmeticRouter.use('/CustomerSources', customerSourcesRoutes)",
      "cosmeticRouter.use('/DotKhams', dotKhamsRoutes)",
      "cosmeticRouter.use('/settings', bankSettingsRoutes)",
      "cosmeticRouter.use('/ExternalCheckups', externalCheckupsRoutes)",
      "cosmeticRouter.use('/face', faceRecognitionRoutes)",
      "cosmeticRouter.use('/Exports', exportsRoutes)",
    ].forEach((mount) => {
      expect(serverSource).toContain(mount);
    });
  });
});
