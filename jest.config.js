module.exports = {
  projects: [
    "packages/common",
    "packages/comment",
    "packages/desktop",
    "packages/poll",
    "packages/screen",
    "packages/server",
  ],
  "reporters": [
    "default",
    ["jest-junit", {
      "outputFile": "reports/jest-junit.xml",
      "classNameTemplate": "{classname}",
      "titleTemplate": "{title}",
      "suiteNameTemplate": "{filepath}",
    }],
  ]

}
