// .dependency-cruiser.js
// Enforces architectural layer rules. Run with: npx depcruise --output-type err website/src

module.exports = {
  forbidden: [
    {
      name: 'shared-no-pages',
      severity: 'error',
      from: { path: '^website/src/components/shared/' },
      to: { path: '^website/src/pages/' }
    },
    {
      name: 'shared-no-domain',
      severity: 'error',
      from: { path: '^website/src/components/shared/' },
      to: { path: '^website/src/components/(customer|payment|appointments|employees|services|reports|calendar|locations|relationships|settings|website|debug|ui|modules)/' }
    },
    {
      name: 'hooks-no-pages',
      severity: 'error',
      from: { path: '^website/src/hooks/' },
      to: { path: '^website/src/pages/' }
    },
    {
      name: 'api-no-ui',
      severity: 'error',
      from: { path: '^website/src/lib/api/' },
      to: { path: '^website/src/components/' }
    },
    {
      name: 'contexts-no-pages',
      severity: 'error',
      from: { path: '^website/src/contexts/' },
      to: { path: '^website/src/pages/' }
    },
    {
      name: 'contracts-no-deps',
      severity: 'error',
      from: { path: '^contracts/' },
      to: { path: '^(website|api)/' }
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'website/tsconfig.json' },
    enhancedResolveOptions: { exportsFields: ['exports'] }
  }
};
