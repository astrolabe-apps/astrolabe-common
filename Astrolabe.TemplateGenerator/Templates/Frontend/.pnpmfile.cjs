/**
 * This is a pnpm configuration file for Rush monorepo.
 * It helps resolve workspace dependencies and peer dependencies.
 */

module.exports = {
  hooks: {
    readPackage(pkg) {
      // Allow workspace protocol for local packages
      return pkg;
    }
  }
};
