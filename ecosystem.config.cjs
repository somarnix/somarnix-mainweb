const appName = process.env.APP_NAME || "somarnix";
const cwd = process.env.APP_DIR || __dirname;
const port = process.env.PORT || "3000";

module.exports = {
  apps: [
    {
      name: appName,
      cwd,
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: port,
      },
    },
  ],
};
