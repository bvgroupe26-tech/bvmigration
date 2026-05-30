module.exports = {
  appId: "com.bvgroupe.rh",
  productName: "BV GROUPE RH",
  directories: { output: "dist" },
  files: ["out/**", "electron/**"],
  win: { target: "nsis" },
  mac: { target: "dmg" },
  linux: { target: "AppImage" },
};
