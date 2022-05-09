module.exports = {
  "roots": [
    "<rootDir>/src"
  ],
  "moduleNameMapper": {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  "testEnvironment": "node",
  "testMatch": [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  "displayName": "app",
}
